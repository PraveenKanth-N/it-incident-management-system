package com.incident.system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incident.system.entity.*;
import com.incident.system.repository.*;
import com.incident.system.security.JwtTokenProvider;
import com.incident.system.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AnalyticsControllerIntegrationTest {

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
    private SlaPolicyRepository slaPolicyRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User adminUser;
    private User technicianUser;
    private User employeeUser;
    private IncidentCategory softwareCategory;
    private IncidentCategory networkCategory;
    private SlaPolicy criticalSla;

    private String adminToken;
    private String technicianToken;
    private String employeeToken;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN).orElseGet(() ->
                roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build()));
        Role techRole = roleRepository.findByName(RoleName.ROLE_TECHNICIAN).orElseGet(() ->
                roleRepository.save(Role.builder().name(RoleName.ROLE_TECHNICIAN).description("Technician").build()));
        Role empRole = roleRepository.findByName(RoleName.ROLE_EMPLOYEE).orElseGet(() ->
                roleRepository.save(Role.builder().name(RoleName.ROLE_EMPLOYEE).description("Employee").build()));

        adminUser = userRepository.save(User.builder()
                .username("admin.analytics")
                .email("admin.analytics@resolv.test")
                .passwordHash("$2a$12$eXampleHashForTestingPurposesOnly1234567890")
                .fullName("Super Admin")
                .department("IT Infrastructure")
                .role(adminRole)
                .isActive(true)
                .build());

        technicianUser = userRepository.save(User.builder()
                .username("tech.analytics")
                .email("tech.analytics@resolv.test")
                .passwordHash("$2a$12$eXampleHashForTestingPurposesOnly1234567890")
                .fullName("Dave Technician")
                .department("NOC Operations")
                .role(techRole)
                .isActive(true)
                .build());

        employeeUser = userRepository.save(User.builder()
                .username("emp.analytics")
                .email("emp.analytics@resolv.test")
                .passwordHash("$2a$12$eXampleHashForTestingPurposesOnly1234567890")
                .fullName("Alice Employee")
                .department("Finance")
                .role(empRole)
                .isActive(true)
                .build());

        softwareCategory = categoryRepository.findByName("Software & OS").orElseGet(() ->
                categoryRepository.save(IncidentCategory.builder().name("Software & OS").slaHours(4).build()));
        networkCategory = categoryRepository.findByName("Network & VPN").orElseGet(() ->
                categoryRepository.save(IncidentCategory.builder().name("Network & VPN").slaHours(2).build()));

        criticalSla = slaPolicyRepository.findByPriority(Priority.CRITICAL).orElseGet(() ->
                slaPolicyRepository.save(SlaPolicy.builder()
                        .name("Critical SLA")
                        .priority(Priority.CRITICAL)
                        .responseTimeHours(1)
                        .resolutionTimeHours(4)
                        .isActive(true)
                        .build()));

        adminToken = jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(adminUser));
        technicianToken = jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(technicianUser));
        employeeToken = jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(employeeUser));

        // Seed 2 incidents
        Incident inc1 = Incident.builder()
                .ticketNumber("INC-TEST-001")
                .title("Core switch flapping")
                .description("Port 24 bouncing")
                .impact(Impact.HIGH)
                .urgency(Urgency.HIGH)
                .priority(Priority.CRITICAL)
                .status(IncidentStatus.OPEN)
                .category(networkCategory)
                .reporter(employeeUser)
                .assignee(null)
                .slaPolicy(criticalSla)
                .createdAt(Instant.now().minus(Duration.ofHours(1)))
                .build();
        incidentRepository.save(inc1);

        Incident inc2 = Incident.builder()
                .ticketNumber("INC-TEST-002")
                .title("ERP Portal 500")
                .description("Internal error")
                .impact(Impact.HIGH)
                .urgency(Urgency.HIGH)
                .priority(Priority.CRITICAL)
                .status(IncidentStatus.RESOLVED)
                .category(softwareCategory)
                .reporter(employeeUser)
                .assignee(technicianUser)
                .slaPolicy(criticalSla)
                .createdAt(Instant.now().minus(Duration.ofHours(3)))
                .resolvedAt(Instant.now().minus(Duration.ofHours(1)))
                .resolutionNotes("Connection pool size increased")
                .build();
        incidentRepository.save(inc2);
    }

    @Test
    @DisplayName("Unauthenticated Access: GET /api/v1/analytics/dashboard should return 401 Unauthorized")
    void testDashboardUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/dashboard"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Admin Access: GET /api/v1/analytics/dashboard should return 200 OK with correct KPI aggregations")
    void testDashboardAsAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/dashboard")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncidents", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.openCount", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.resolvedCount", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.criticalCount", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.unassignedCount", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.slaMetrics.totalEvaluated", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.slaMetrics.complianceRate", notNullValue()))
                .andExpect(jsonPath("$.byStatus.OPEN", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.byPriority.CRITICAL", greaterThanOrEqualTo(2)));
    }

    @Test
    @DisplayName("Filtered Dashboard: Should filter metrics by status and priority")
    void testDashboardWithFilters() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/dashboard")
                        .param("status", "OPEN")
                        .param("priority", "CRITICAL")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncidents", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.openCount", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.resolvedCount").value(0));
    }

    @Test
    @DisplayName("Employee Dashboard: Should return 200 OK with metrics isolated to employee's tickets")
    void testDashboardAsEmployee() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/dashboard")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + employeeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncidents", greaterThanOrEqualTo(2)));
    }

    @Test
    @DisplayName("Trends Time Series: GET /api/v1/analytics/trends should return 200 OK with daily series")
    void testTrendsEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/trends")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)))
                .andExpect(jsonPath("$[0].date", notNullValue()))
                .andExpect(jsonPath("$[0].createdCount", notNullValue()))
                .andExpect(jsonPath("$[0].resolvedCount", notNullValue()));
    }

    @Test
    @DisplayName("Technicians Workload: Admin and Technician should receive 200 OK")
    void testTechnicianWorkloadAllowed() throws Exception {
        // Admin call
        mockMvc.perform(get("/api/v1/analytics/technicians")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)))
                .andExpect(jsonPath("$[?(@.username == 'tech.analytics')].totalAssignedCount", hasItem(1)));

        // Technician call
        mockMvc.perform(get("/api/v1/analytics/technicians")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + technicianToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Technicians Workload: Employee role should be rejected with 403 Forbidden")
    void testTechnicianWorkloadForbiddenForEmployee() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/technicians")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + employeeToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("CSV Export: GET /api/v1/analytics/export/csv should return valid CSV attachment with headers")
    void testCsvExportEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/export/csv")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString("text/csv")))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("attachment; filename=\"incident_report_")))
                .andExpect(content().string(containsString("Ticket Number,Title,Category,Priority,Status")))
                .andExpect(content().string(containsString("INC-TEST-001")))
                .andExpect(content().string(containsString("INC-TEST-002")));
    }
}
