package com.incident.system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incident.system.dto.*;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdministrationControllerIntegrationTest {

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
    private AuditEventRepository auditEventRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User adminUser;
    private User secondAdmin;
    private User technicianUser;
    private User employeeUser;

    private String adminToken;
    private String technicianToken;
    private String employeeToken;

    private IncidentCategory testCategory;
    private SlaPolicy testSlaPolicy;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build()));
        Role techRole = roleRepository.findByName(RoleName.ROLE_TECHNICIAN)
                .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_TECHNICIAN).description("Technician").build()));
        Role empRole = roleRepository.findByName(RoleName.ROLE_EMPLOYEE)
                .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_EMPLOYEE).description("Employee").build()));

        adminUser = userRepository.save(User.builder()
                .username("admin.test" + System.nanoTime())
                .email("admin" + System.nanoTime() + "@resolv.internal")
                .passwordHash("hashed")
                .fullName("System Administrator")
                .role(adminRole)
                .isActive(true)
                .build());

        secondAdmin = userRepository.save(User.builder()
                .username("admin2.test" + System.nanoTime())
                .email("admin2" + System.nanoTime() + "@resolv.internal")
                .passwordHash("hashed")
                .fullName("Secondary Administrator")
                .role(adminRole)
                .isActive(true)
                .build());

        technicianUser = userRepository.save(User.builder()
                .username("tech.test" + System.nanoTime())
                .email("tech" + System.nanoTime() + "@resolv.internal")
                .passwordHash("hashed")
                .fullName("Test Technician")
                .role(techRole)
                .isActive(true)
                .build());

        employeeUser = userRepository.save(User.builder()
                .username("emp.test" + System.nanoTime())
                .email("emp" + System.nanoTime() + "@resolv.internal")
                .passwordHash("hashed")
                .fullName("Test Employee")
                .role(empRole)
                .isActive(true)
                .build());

        adminToken = "Bearer " + jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(adminUser));
        technicianToken = "Bearer " + jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(technicianUser));
        employeeToken = "Bearer " + jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(employeeUser));

        testCategory = categoryRepository.save(IncidentCategory.builder()
                .name("Database Cluster " + System.nanoTime())
                .description("Cluster failover and storage")
                .slaHours(8)
                .isActive(true)
                .build());

        testSlaPolicy = slaPolicyRepository.findByPriority(Priority.CRITICAL)
                .orElseGet(() -> slaPolicyRepository.save(SlaPolicy.builder()
                        .name("Critical SLA")
                        .priority(Priority.CRITICAL)
                        .responseTimeHours(1)
                        .resolutionTimeHours(4)
                        .isActive(true)
                        .build()));

        auditEventRepository.save(AuditEvent.builder()
                .entityType("INCIDENT")
                .entityId(101L)
                .action("STATUS_CHANGE")
                .performedBy(adminUser)
                .previousState("{\"status\":\"OPEN\"}")
                .newState("{\"status\":\"ASSIGNED\"}")
                .ipAddress("127.0.0.1")
                .build());
    }

    // ========================================================
    // 1. User Administration API Tests
    // ========================================================

    @Test
    @DisplayName("User API - Admin can filter users by keyword, role, and active status")
    void getAllUsers_AdminSearchFilter_Success() throws Exception {
        mockMvc.perform(get("/api/v1/users")
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .param("search", technicianUser.getUsername())
                        .param("role", "ROLE_TECHNICIAN")
                        .param("isActive", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data.content[0].username").value(technicianUser.getUsername()))
                .andExpect(jsonPath("$.data.content[0].role").value("ROLE_TECHNICIAN"));
    }

    @Test
    @DisplayName("User API - Employee is forbidden from querying user directory")
    void getAllUsers_EmployeeForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/users")
                        .header(HttpHeaders.AUTHORIZATION, employeeToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("User API - Admin can update user status")
    void updateUserStatus_Admin_Success() throws Exception {
        UpdateUserStatusRequest req = UpdateUserStatusRequest.builder().isActive(false).build();

        mockMvc.perform(patch("/api/v1/users/{id}/status", technicianUser.getId())
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isActive").value(false));
    }

    @Test
    @DisplayName("User API - Admin cannot deactivate their own active account")
    void updateUserStatus_SelfDeactivation_Conflict() throws Exception {
        UpdateUserStatusRequest req = UpdateUserStatusRequest.builder().isActive(false).build();

        mockMvc.perform(patch("/api/v1/users/{id}/status", adminUser.getId())
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("cannot deactivate their own active account")));
    }

    @Test
    @DisplayName("User API - Admin can update user role")
    void updateUserRole_Admin_Success() throws Exception {
        UpdateUserRoleRequest req = UpdateUserRoleRequest.builder().role("ROLE_TECHNICIAN").build();

        mockMvc.perform(patch("/api/v1/users/{id}/role", employeeUser.getId())
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.role").value("ROLE_TECHNICIAN"));
    }

    @Test
    @DisplayName("User API - Technician cannot update user role")
    void updateUserRole_Technician_Forbidden() throws Exception {
        UpdateUserRoleRequest req = UpdateUserRoleRequest.builder().role("ROLE_ADMIN").build();

        mockMvc.perform(patch("/api/v1/users/{id}/role", employeeUser.getId())
                        .header(HttpHeaders.AUTHORIZATION, technicianToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // ========================================================
    // 2. Incident Configuration API Tests (Categories & SLA)
    // ========================================================

    @Test
    @DisplayName("Category API - Admin can create a new category")
    void createCategory_Admin_Success() throws Exception {
        CategoryRequest req = CategoryRequest.builder()
                .name("Kubernetes Services " + System.nanoTime())
                .description("Pod and node orchestration")
                .slaHours(4)
                .isActive(true)
                .build();

        mockMvc.perform(post("/api/v1/incidents/categories")
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.slaHours").value(4));
    }

    @Test
    @DisplayName("Category API - Employee cannot create a category")
    void createCategory_Employee_Forbidden() throws Exception {
        CategoryRequest req = CategoryRequest.builder()
                .name("Unapproved Cat")
                .slaHours(12)
                .build();

        mockMvc.perform(post("/api/v1/incidents/categories")
                        .header(HttpHeaders.AUTHORIZATION, employeeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Category API - Admin can toggle active status of category")
    void toggleCategoryStatus_Admin_Success() throws Exception {
        mockMvc.perform(patch("/api/v1/incidents/categories/{id}/toggle-status", testCategory.getId())
                        .header(HttpHeaders.AUTHORIZATION, adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isActive").value(false));
    }

    @Test
    @DisplayName("SLA Policies API - Admin can update priority SLA thresholds")
    void updateSlaPolicy_Admin_Success() throws Exception {
        UpdateSlaPolicyRequest req = UpdateSlaPolicyRequest.builder()
                .responseTimeHours(2)
                .resolutionTimeHours(6)
                .description("Updated SLA Critical Policy")
                .isActive(true)
                .build();

        mockMvc.perform(put("/api/v1/incidents/sla-policies/{priority}", "CRITICAL")
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.responseTimeHours").value(2))
                .andExpect(jsonPath("$.data.resolutionTimeHours").value(6));
    }

    @Test
    @DisplayName("SLA Policies API - Technician is forbidden from modifying SLA policies")
    void updateSlaPolicy_Technician_Forbidden() throws Exception {
        UpdateSlaPolicyRequest req = UpdateSlaPolicyRequest.builder()
                .responseTimeHours(2)
                .resolutionTimeHours(6)
                .build();

        mockMvc.perform(put("/api/v1/incidents/sla-policies/{priority}", "CRITICAL")
                        .header(HttpHeaders.AUTHORIZATION, technicianToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // ========================================================
    // 3. Audit Log Explorer API Tests
    // ========================================================

    @Test
    @DisplayName("Audit API - Admin can search and paginate audit events")
    void getAuditEvents_Admin_Success() throws Exception {
        mockMvc.perform(get("/api/v1/audit")
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .param("page", "0")
                        .param("size", "10")
                        .param("entityType", "INCIDENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data.content[0].entityType").value("INCIDENT"))
                .andExpect(jsonPath("$.data.content[0].performedByUsername").value(adminUser.getUsername()));
    }

    @Test
    @DisplayName("Audit API - Technician and Employee are forbidden from audit log explorer")
    void getAuditEvents_UnauthorizedRoles_Forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/audit")
                        .header(HttpHeaders.AUTHORIZATION, technicianToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/audit")
                        .header(HttpHeaders.AUTHORIZATION, employeeToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Audit API - Admin can fetch distinct entity types and actions")
    void getAuditMetadata_Admin_Success() throws Exception {
        mockMvc.perform(get("/api/v1/audit/entity-types")
                        .header(HttpHeaders.AUTHORIZATION, adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasItem("INCIDENT")));

        mockMvc.perform(get("/api/v1/audit/actions")
                        .header(HttpHeaders.AUTHORIZATION, adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasItem("STATUS_CHANGE")));
    }
}
