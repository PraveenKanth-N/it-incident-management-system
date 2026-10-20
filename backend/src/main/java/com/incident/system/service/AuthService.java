package com.incident.system.service;

import com.incident.system.dto.AuthResponse;
import com.incident.system.dto.LoginRequest;
import com.incident.system.dto.RegisterRequest;
import com.incident.system.dto.UserSummaryDto;
import com.incident.system.entity.Role;
import com.incident.system.entity.RoleName;
import com.incident.system.entity.User;
import com.incident.system.exception.ConflictException;
import com.incident.system.exception.ResourceNotFoundException;
import com.incident.system.repository.RoleRepository;
import com.incident.system.repository.UserRepository;
import com.incident.system.security.JwtTokenProvider;
import com.incident.system.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtTokenProvider.generateToken(authentication);
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();

        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));

        return AuthResponse.builder()
                .token(jwt)
                .tokenType("Bearer")
                .expiresInMs(jwtTokenProvider.getExpirationMs())
                .user(UserSummaryDto.fromEntity(user))
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest registerRequest) {
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new ConflictException("Username '" + registerRequest.getUsername() + "' is already taken");
        }

        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new ConflictException("Email '" + registerRequest.getEmail() + "' is already registered");
        }

        // Standard self-registration defaults strictly to ROLE_EMPLOYEE
        Role role = roleRepository.findByName(RoleName.ROLE_EMPLOYEE)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_EMPLOYEE, "Standard Employee")));

        User user = User.builder()
                .username(registerRequest.getUsername())
                .email(registerRequest.getEmail())
                .passwordHash(passwordEncoder.encode(registerRequest.getPassword()))
                .fullName(registerRequest.getFullName())
                .department(registerRequest.getDepartment())
                .role(role)
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);

        UserDetailsImpl userDetails = UserDetailsImpl.build(savedUser);
        String jwt = jwtTokenProvider.generateTokenFromUserDetails(userDetails);

        return AuthResponse.builder()
                .token(jwt)
                .tokenType("Bearer")
                .expiresInMs(jwtTokenProvider.getExpirationMs())
                .user(UserSummaryDto.fromEntity(savedUser))
                .build();
    }
}
