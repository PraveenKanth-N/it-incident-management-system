package com.incident.system.service;

import com.incident.system.dto.ChangePasswordRequest;
import com.incident.system.dto.RegisterRequest;
import com.incident.system.dto.UserSummaryDto;
import com.incident.system.entity.Role;
import com.incident.system.entity.RoleName;
import com.incident.system.entity.User;
import com.incident.system.exception.ResourceNotFoundException;
import com.incident.system.repository.RoleRepository;
import com.incident.system.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private UserService userService;

    private Role technicianRole;
    private User technicianUser;

    @BeforeEach
    void setUp() {
        technicianRole = new Role(RoleName.ROLE_TECHNICIAN, "IT Technician");
        technicianRole.setId(2L);

        technicianUser = User.builder()
                .id(15L)
                .username("tech.bob")
                .email("tech.bob@example.com")
                .fullName("Bob Tech")
                .passwordHash("$2a$12$encodedCurrentPassword")
                .role(technicianRole)
                .department("IT Infrastructure")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("Get Current User - Successfully returns user summary without password")
    void testGetCurrentUser() {
        when(userRepository.findByUsername("tech.bob")).thenReturn(Optional.of(technicianUser));

        UserSummaryDto result = userService.getCurrentUser("tech.bob");

        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo("tech.bob");
        assertThat(result.getRole()).isEqualTo("ROLE_TECHNICIAN");
        assertThat(result.getEmail()).isEqualTo("tech.bob@example.com");
    }

    @Test
    @DisplayName("Admin User Creation - Successfully creates user with explicit ROLE_TECHNICIAN")
    void testCreateUserByAdminWithRole() {
        RegisterRequest request = RegisterRequest.builder()
                .username("tech.alice")
                .email("alice@example.com")
                .password("Password123!")
                .fullName("Alice Tech")
                .department("Service Desk")
                .role("ROLE_TECHNICIAN")
                .build();

        when(userRepository.existsByUsername("tech.alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(roleRepository.findByName(RoleName.ROLE_TECHNICIAN)).thenReturn(Optional.of(technicianRole));
        when(passwordEncoder.encode("Password123!")).thenReturn("$2a$12$newHashedPassword");

        User saved = User.builder()
                .id(25L)
                .username("tech.alice")
                .email("alice@example.com")
                .fullName("Alice Tech")
                .passwordHash("$2a$12$newHashedPassword")
                .department("Service Desk")
                .role(technicianRole)
                .isActive(true)
                .build();

        when(userRepository.save(any(User.class))).thenReturn(saved);

        UserSummaryDto result = userService.createUserByAdmin(request);

        assertThat(result.getUsername()).isEqualTo("tech.alice");
        assertThat(result.getRole()).isEqualTo("ROLE_TECHNICIAN");
    }

    @Test
    @DisplayName("Change Password - Successfully updates password when current password matches")
    void testChangePasswordSuccess() {
        ChangePasswordRequest request = new ChangePasswordRequest("OldPassword123!", "NewSecret123!");

        when(userRepository.findByUsername("tech.bob")).thenReturn(Optional.of(technicianUser));
        when(passwordEncoder.matches("OldPassword123!", "$2a$12$encodedCurrentPassword")).thenReturn(true);
        when(passwordEncoder.encode("NewSecret123!")).thenReturn("$2a$12$brandNewHash");

        userService.changePassword("tech.bob", request);

        assertThat(technicianUser.getPasswordHash()).isEqualTo("$2a$12$brandNewHash");
        verify(userRepository).save(technicianUser);
    }

    @Test
    @DisplayName("Change Password Failure - Rejects when current password is wrong")
    void testChangePasswordMismatch() {
        ChangePasswordRequest request = new ChangePasswordRequest("WrongPassword!", "NewSecret123!");

        when(userRepository.findByUsername("tech.bob")).thenReturn(Optional.of(technicianUser));
        when(passwordEncoder.matches("WrongPassword!", "$2a$12$encodedCurrentPassword")).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword("tech.bob", request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Current password does not match");

        verify(userRepository, never()).save(any(User.class));
    }
}
