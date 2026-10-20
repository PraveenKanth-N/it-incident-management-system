package com.incident.system.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incident.system.dto.ChangePasswordRequest;
import com.incident.system.dto.CreateIncidentRequest;
import com.incident.system.dto.LoginRequest;
import com.incident.system.dto.UpdateUserStatusRequest;
import com.incident.system.entity.*;
import com.incident.system.repository.*;
import com.incident.system.service.AnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class SecurityHardeningIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private IncidentCategoryRepository categoryRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private AnalyticsService analyticsService;

    private User adminUser;
    private User techUser;
    private User employeeUser;
    private User deactivatedUser;

    private String adminToken;
    private String techToken;
    private String employeeToken;
    private String deactivatedUserToken;

    private IncidentCategory category;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_ADMIN, "Admin")));
        Role techRole = roleRepository.findByName(RoleName.ROLE_TECHNICIAN)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_TECHNICIAN, "Tech")));
        Role empRole = roleRepository.findByName(RoleName.ROLE_EMPLOYEE)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_EMPLOYEE, "Employee")));

        long suffix = System.nanoTime();

        adminUser = userRepository.save(User.builder()
                .username("sec.admin." + suffix)
                .email("sec.admin." + suffix + "@resolv.local")
                .fullName("Sec Admin")
                .department("IT Security")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .role(adminRole)
                .isActive(true)
                .createdAt(Instant.now())
                .build());

        techUser = userRepository.save(User.builder()
                .username("sec.tech." + suffix)
                .email("sec.tech." + suffix + "@resolv.local")
                .fullName("Sec Tech")
                .department("NOC")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .role(techRole)
                .isActive(true)
                .createdAt(Instant.now())
                .build());

        employeeUser = userRepository.save(User.builder()
                .username("sec.emp." + suffix)
                .email("sec.emp." + suffix + "@resolv.local")
                .fullName("Sec Employee")
                .department("Operations")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .role(empRole)
                .isActive(true)
                .createdAt(Instant.now())
                .build());

        // Create deactivated user
        deactivatedUser = userRepository.save(User.builder()
                .username("sec.deact." + suffix)
                .email("sec.deact." + suffix + "@resolv.local")
                .fullName("Deactivated Account")
                .department("Operations")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .role(empRole)
                .isActive(false)
                .createdAt(Instant.now())
                .build());

        category = categoryRepository.save(IncidentCategory.builder()
                .name("Security Testing Cat " + suffix)
                .description("Category for security tests")
                .slaHours(8)
                .isActive(true)
                .build());

        adminToken = "Bearer " + jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(adminUser));
        techToken = "Bearer " + jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(techUser));
        employeeToken = "Bearer " + jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(employeeUser));
        deactivatedUserToken = "Bearer " + jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(deactivatedUser));
    }

    // ========================================================
    // 1. Session & Account Status Security Tests
    // ========================================================

    @Test
    @DisplayName("Security - Deactivated user with unexpired JWT token is rejected with HTTP 401")
    void testDeactivatedUserWithValidTokenIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, deactivatedUserToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Security - Deactivated user attempting login returns HTTP 401 with safe error message")
    void testDeactivatedUserLoginReturns401() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setUsername(deactivatedUser.getUsername());
        req.setPassword("Password123!");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", containsString("Account is disabled or locked")));
    }

    @Test
    @DisplayName("Security - Bad credentials return HTTP 401 with standard error")
    void testBadCredentialsReturn401() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setUsername(employeeUser.getUsername());
        req.setPassword("WrongPassword999!");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", containsString("Invalid username or password")));
    }

    // ========================================================
    // 2. HTTP Security Headers
    // ========================================================

    @Test
    @DisplayName("Security - HTTP response headers enforce X-Frame-Options, CSP, and Content-Type-Options")
    void testHttpSecurityHeaders() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", "geolocation=(), camera=(), microphone=()"));
    }

    // ========================================================
    // 3. Defense-in-Depth Filter Chain Authorization
    // ========================================================

    @Test
    @DisplayName("Security - Audit endpoints reject unauthenticated requests with HTTP 401")
    void testAuditUnauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/audit"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Security - Audit endpoints reject employee access with HTTP 403")
    void testAuditEmployeeForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/audit")
                        .header(HttpHeaders.AUTHORIZATION, employeeToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security - Audit endpoints reject technician access with HTTP 403")
    void testAuditTechnicianForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/audit")
                        .header(HttpHeaders.AUTHORIZATION, techToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security - Technician cannot modify user status (blocked at filter chain with HTTP 403)")
    void testTechnicianCannotModifyUserStatus() throws Exception {
        UpdateUserStatusRequest req = UpdateUserStatusRequest.builder().isActive(false).build();

        mockMvc.perform(patch("/api/v1/users/{id}/status", employeeUser.getId())
                        .header(HttpHeaders.AUTHORIZATION, techToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // ========================================================
    // 4. CSV Formula Injection Defense (CWE-1236)
    // ========================================================

    @Test
    @DisplayName("Security - CSV Export sanitizes formula triggers (=, +, -, @) with single quote prefix")
    void testCsvFormulaInjectionDefense() throws Exception {
        // Create an incident with formula injection payload in title
        Incident maliciousIncident = incidentRepository.save(Incident.builder()
                .ticketNumber("INC-SEC-FORMULA")
                .title("=CMD|' /C calc'!A0")
                .description("Testing CSV formula sanitization")
                .category(category)
                .priority(Priority.HIGH)
                .impact(Impact.HIGH)
                .urgency(Urgency.MEDIUM)
                .status(IncidentStatus.OPEN)
                .reporter(employeeUser)
                .resolutionNotes("@SUM(1+1)")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        MvcResult result = mockMvc.perform(get("/api/v1/analytics/export/csv")
                        .header(HttpHeaders.AUTHORIZATION, adminToken))
                .andExpect(status().isOk())
                .andReturn();

        String csvContent = new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);

        // Verify that the title starting with = is sanitized to '=CMD|' /C calc'!A0
        assertThat(csvContent).contains("'=CMD|' /C calc'!A0");
        // Verify that resolution notes starting with @ is sanitized to '@SUM(1+1)
        assertThat(csvContent).contains("'@SUM(1+1)");

        // Clean up
        incidentRepository.delete(maliciousIncident);
    }

    // ========================================================
    // 5. Password Management Hardening
    // ========================================================

    @Test
    @DisplayName("Security - Password change rejects new password identical to current password")
    void testPasswordChangeRejectsIdenticalPassword() throws Exception {
        ChangePasswordRequest req = ChangePasswordRequest.builder()
                .currentPassword("Password123!")
                .newPassword("Password123!")
                .build();

        mockMvc.perform(put("/api/v1/users/me/password")
                        .header(HttpHeaders.AUTHORIZATION, employeeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("New password cannot be identical to current password")));
    }

    // ========================================================
    // 6. Input Validation Boundaries
    // ========================================================

    @Test
    @DisplayName("Security - Oversized description (>10,000 chars) is rejected with HTTP 400")
    void testOversizedDescriptionIsRejected() throws Exception {
        String oversizedDesc = "A".repeat(10001);

        CreateIncidentRequest req = CreateIncidentRequest.builder()
                .title("Valid Title Here")
                .description(oversizedDesc)
                .categoryId(category.getId())
                .impact(Impact.MEDIUM)
                .urgency(Urgency.MEDIUM)
                .build();

        mockMvc.perform(post("/api/v1/incidents")
                        .header(HttpHeaders.AUTHORIZATION, employeeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.description").exists());
    }
}
