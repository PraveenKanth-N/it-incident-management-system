package com.incident.system.service;

import com.incident.system.dto.*;
import com.incident.system.entity.Role;
import com.incident.system.entity.RoleName;
import com.incident.system.entity.User;
import com.incident.system.exception.ConflictException;
import com.incident.system.exception.ResourceNotFoundException;
import com.incident.system.repository.RoleRepository;
import com.incident.system.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public UserSummaryDto getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return UserSummaryDto.fromEntity(user);
    }

    @Transactional(readOnly = true)
    public UserSummaryDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return UserSummaryDto.fromEntity(user);
    }

    @Transactional(readOnly = true)
    public PagedResponse<UserSummaryDto> getAllUsers(Pageable pageable) {
        return getUsers(null, null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public PagedResponse<UserSummaryDto> getUsers(String search, String role, String department, 
                                                Boolean isActive, Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> cb.conjunction();

        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("username")), pattern),
                cb.like(cb.lower(root.get("fullName")), pattern),
                cb.like(cb.lower(root.get("email")), pattern)
            ));
        }

        if (role != null && !role.isBlank() && !role.equalsIgnoreCase("ALL")) {
            String roleStr = role.trim().toUpperCase();
            if (!roleStr.startsWith("ROLE_")) {
                roleStr = "ROLE_" + roleStr;
            }
            final String finalRoleStr = roleStr;
            try {
                RoleName roleName = RoleName.valueOf(finalRoleStr);
                spec = spec.and((root, query, cb) -> {
                    Join<User, Role> roleJoin = root.join("role", JoinType.INNER);
                    return cb.equal(roleJoin.get("name"), roleName);
                });
            } catch (IllegalArgumentException ignored) {
                // Ignore unrecognized role filter
            }
        }

        if (department != null && !department.isBlank() && !department.equalsIgnoreCase("ALL")) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("department")), department.trim().toLowerCase()));
        }

        if (isActive != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isActive"), isActive));
        }

        Page<User> users = userRepository.findAll(spec, pageable);
        return PagedResponse.of(users.map(UserSummaryDto::fromEntity));
    }

    @Transactional
    public UserSummaryDto createUserByAdmin(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("Username '" + request.getUsername() + "' is already in use");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email '" + request.getEmail() + "' is already registered");
        }

        RoleName resolvedRole = RoleName.ROLE_EMPLOYEE;
        if (request.getRole() != null && !request.getRole().isBlank()) {
            try {
                String roleStr = request.getRole().toUpperCase();
                if (!roleStr.startsWith("ROLE_")) {
                    roleStr = "ROLE_" + roleStr;
                }
                resolvedRole = RoleName.valueOf(roleStr);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid role specified: " + request.getRole() + 
                        ". Supported roles: ROLE_EMPLOYEE, ROLE_TECHNICIAN, ROLE_ADMIN");
            }
        }

        final RoleName finalRole = resolvedRole;
        Role role = roleRepository.findByName(finalRole)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + finalRole));

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .department(request.getDepartment())
                .role(role)
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);

        auditService.logEvent("USER", savedUser.getId(), "USER_CREATED", null,
                null, String.format("{\"username\":\"%s\",\"role\":\"%s\",\"department\":\"%s\"}", 
                        savedUser.getUsername(), finalRole.name(), savedUser.getDepartment()));

        return UserSummaryDto.fromEntity(savedUser);
    }

    @Transactional
    public UserSummaryDto updateUserStatus(Long userId, UpdateUserStatusRequest request, String adminUsername) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        User adminUser = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found: " + adminUsername));

        boolean newStatus = Boolean.TRUE.equals(request.getIsActive());
        boolean oldStatus = targetUser.isActive();

        if (oldStatus == newStatus) {
            return UserSummaryDto.fromEntity(targetUser);
        }

        // Safeguards on deactivation
        if (!newStatus) {
            // 1. Prevent self-deactivation
            if (targetUser.getId().equals(adminUser.getId())) {
                throw new ConflictException("Administrators cannot deactivate their own active account");
            }

            // 2. Prevent deactivating final active administrator
            if (targetUser.getRole() != null && targetUser.getRole().getName() == RoleName.ROLE_ADMIN) {
                long activeAdminCount = userRepository.countByRoleNameAndIsActiveTrue(RoleName.ROLE_ADMIN);
                if (activeAdminCount <= 1) {
                    throw new ConflictException("Cannot deactivate the final remaining active administrator");
                }
            }
        }

        targetUser.setActive(newStatus);
        User savedUser = userRepository.save(targetUser);

        String action = newStatus ? "USER_ACTIVATED" : "USER_DEACTIVATED";
        auditService.logEvent("USER", savedUser.getId(), action, adminUser,
                String.format("{\"isActive\":%b}", oldStatus),
                String.format("{\"isActive\":%b}", newStatus));

        log.info("Admin {} changed user {} (id={}) active status from {} to {}",
                adminUsername, savedUser.getUsername(), savedUser.getId(), oldStatus, newStatus);

        return UserSummaryDto.fromEntity(savedUser);
    }

    @Transactional
    public UserSummaryDto updateUserRole(Long userId, UpdateUserRoleRequest request, String adminUsername) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        User adminUser = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found: " + adminUsername));

        String roleStr = request.getRole().trim().toUpperCase();
        if (!roleStr.startsWith("ROLE_")) {
            roleStr = "ROLE_" + roleStr;
        }

        RoleName newRoleName;
        try {
            newRoleName = RoleName.valueOf(roleStr);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role specified: " + request.getRole() + 
                    ". Supported roles: ROLE_EMPLOYEE, ROLE_TECHNICIAN, ROLE_ADMIN");
        }

        RoleName oldRoleName = targetUser.getRole() != null ? targetUser.getRole().getName() : RoleName.ROLE_EMPLOYEE;
        if (oldRoleName == newRoleName) {
            return UserSummaryDto.fromEntity(targetUser);
        }

        // Safeguards on demoting from ROLE_ADMIN
        if (oldRoleName == RoleName.ROLE_ADMIN && newRoleName != RoleName.ROLE_ADMIN) {
            // Prevent demoting own role if sole active administrator
            if (targetUser.getId().equals(adminUser.getId())) {
                long activeAdminCount = userRepository.countByRoleNameAndIsActiveTrue(RoleName.ROLE_ADMIN);
                if (activeAdminCount <= 1) {
                    throw new ConflictException("Cannot demote the final remaining active administrator");
                }
            } else if (targetUser.isActive()) {
                long activeAdminCount = userRepository.countByRoleNameAndIsActiveTrue(RoleName.ROLE_ADMIN);
                if (activeAdminCount <= 1) {
                    throw new ConflictException("Cannot demote the final remaining active administrator");
                }
            }
        }

        final RoleName finalRoleName = newRoleName;
        Role newRole = roleRepository.findByName(finalRoleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + finalRoleName));

        targetUser.setRole(newRole);
        User savedUser = userRepository.save(targetUser);

        auditService.logEvent("USER", savedUser.getId(), "USER_ROLE_UPDATED", adminUser,
                String.format("{\"role\":\"%s\"}", oldRoleName.name()),
                String.format("{\"role\":\"%s\"}", newRoleName.name()));

        log.info("Admin {} changed user {} (id={}) role from {} to {}",
                adminUsername, savedUser.getUsername(), savedUser.getId(), oldRoleName.name(), newRoleName.name());

        return UserSummaryDto.fromEntity(savedUser);
    }

    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Current password does not match");
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new IllegalArgumentException("New password cannot be identical to current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        auditService.logEvent("USER", user.getId(), "PASSWORD_CHANGED", user,
                "{\"status\":\"PREVIOUS_PASSWORD_ACTIVE\"}", "{\"status\":\"PASSWORD_ROTATED_SUCCESSFULLY\"}");
    }
}
