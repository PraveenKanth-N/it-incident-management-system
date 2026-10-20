package com.incident.system.service;

import com.incident.system.dto.AuthResponse;
import com.incident.system.dto.LoginRequest;
import com.incident.system.dto.RegisterRequest;
import com.incident.system.entity.Role;
import com.incident.system.entity.RoleName;
import com.incident.system.entity.User;
import com.incident.system.exception.ConflictException;
import com.incident.system.repository.RoleRepository;
import com.incident.system.repository.UserRepository;
import com.incident.system.security.JwtTokenProvider;
import com.incident.system.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthService authService;

    private Role employeeRole;
    private User testUser;

    @BeforeEach
    void setUp() {
        employeeRole = new Role(RoleName.ROLE_EMPLOYEE, "Employee");
        employeeRole.setId(1L);

        testUser = User.builder()
                .id(10L)
                .username("jane.doe")
                .email("jane.doe@example.com")
                .fullName("Jane Doe")
                .passwordHash("$2a$12$hashedPassword")
                .role(employeeRole)
                .department("HR")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("Login Success - Authenticates credentials and returns valid JWT token")
    void testLoginSuccess() {
        LoginRequest request = new LoginRequest("jane.doe", "password123");

        UserDetailsImpl userDetails = UserDetailsImpl.build(testUser);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(userDetails);

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(jwtTokenProvider.generateToken(authentication)).thenReturn("mock.jwt.token");
        when(jwtTokenProvider.getExpirationMs()).thenReturn(86400000L);
        when(userRepository.findById(10L)).thenReturn(Optional.of(testUser));

        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("mock.jwt.token");
        assertThat(response.getUser().getUsername()).isEqualTo("jane.doe");
        assertThat(response.getUser().getRole()).isEqualTo("ROLE_EMPLOYEE");
    }

    @Test
    @DisplayName("Login Failure - Throws BadCredentialsException on invalid credentials")
    void testLoginFailureBadCredentials() {
        LoginRequest request = new LoginRequest("jane.doe", "wrongPassword");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Bad credentials");
    }

    @Test
    @DisplayName("Register Success - Saves user with hashed password and defaults to ROLE_EMPLOYEE")
    void testRegisterSuccess() {
        RegisterRequest request = RegisterRequest.builder()
                .username("new.user")
                .email("new.user@example.com")
                .password("SuperSecret123!")
                .fullName("New User")
                .department("Finance")
                .build();

        when(userRepository.existsByUsername("new.user")).thenReturn(false);
        when(userRepository.existsByEmail("new.user@example.com")).thenReturn(false);
        when(roleRepository.findByName(RoleName.ROLE_EMPLOYEE)).thenReturn(Optional.of(employeeRole));
        when(passwordEncoder.encode("SuperSecret123!")).thenReturn("$2a$12$hashedPassword");

        User savedUser = User.builder()
                .id(20L)
                .username("new.user")
                .email("new.user@example.com")
                .fullName("New User")
                .passwordHash("$2a$12$hashedPassword")
                .department("Finance")
                .role(employeeRole)
                .isActive(true)
                .build();

        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtTokenProvider.generateTokenFromUserDetails(any(UserDetailsImpl.class))).thenReturn("mock.reg.jwt");
        when(jwtTokenProvider.getExpirationMs()).thenReturn(86400000L);

        AuthResponse response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("mock.reg.jwt");
        assertThat(response.getUser().getUsername()).isEqualTo("new.user");
        assertThat(response.getUser().getRole()).isEqualTo("ROLE_EMPLOYEE");
        verify(passwordEncoder).encode("SuperSecret123!");
    }

    @Test
    @DisplayName("Register Failure - Throws ConflictException when username already taken")
    void testRegisterConflictUsername() {
        RegisterRequest request = RegisterRequest.builder()
                .username("jane.doe")
                .email("unique@example.com")
                .password("Password123!")
                .fullName("Jane Doe")
                .build();

        when(userRepository.existsByUsername("jane.doe")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Username 'jane.doe' is already taken");
    }

    @Test
    @DisplayName("Register Failure - Throws ConflictException when email already registered")
    void testRegisterConflictEmail() {
        RegisterRequest request = RegisterRequest.builder()
                .username("unique.user")
                .email("jane.doe@example.com")
                .password("Password123!")
                .fullName("Unique User")
                .build();

        when(userRepository.existsByUsername("unique.user")).thenReturn(false);
        when(userRepository.existsByEmail("jane.doe@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email 'jane.doe@example.com' is already registered");
    }
}
