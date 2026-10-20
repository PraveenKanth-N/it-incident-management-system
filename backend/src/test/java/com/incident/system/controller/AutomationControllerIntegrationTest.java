package com.incident.system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incident.system.dto.UpdateEscalationRuleRequest;
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

import java.time.Instant;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AutomationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private EscalationRuleRepository escalationRuleRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User adminUser;
    private User technicianUser;
    private User employeeUser;

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
                .username("admin.auto")
                .email("admin.auto@resolv.test")
                .passwordHash("$2a$12$eXampleHashForTestingPurposesOnly1234567890")
                .fullName("Admin Automation")
                .department("IT")
                .role(adminRole)
                .isActive(true)
                .build());

        technicianUser = userRepository.save(User.builder()
                .username("tech.auto")
                .email("tech.auto@resolv.test")
                .passwordHash("$2a$12$eXampleHashForTestingPurposesOnly1234567890")
                .fullName("Tech Automation")
                .department("IT")
                .role(techRole)
                .isActive(true)
                .build());

        employeeUser = userRepository.save(User.builder()
                .username("emp.auto")
                .email("emp.auto@resolv.test")
                .passwordHash("$2a$12$eXampleHashForTestingPurposesOnly1234567890")
                .fullName("Emp Automation")
                .department("Sales")
                .role(empRole)
                .isActive(true)
                .build());

        adminToken = jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(adminUser));
        technicianToken = jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(technicianUser));
        employeeToken = jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(employeeUser));

        // Seed default escalation rules
        escalationRuleRepository.save(EscalationRule.builder()
                .priority(Priority.CRITICAL)
                .warningThresholdPercent(75)
                .breachLevel(2)
                .criticalThresholdPercent(150)
                .autoEscalateUnassigned(true)
                .isActive(true)
                .build());

        // Seed sample notification
        notificationRepository.save(Notification.builder()
                .recipient(adminUser)
                .type(NotificationType.SLA_BREACHED)
                .title("Test Breach")
                .message("Test breach alert")
                .channel(NotificationChannel.IN_APP)
                .status(NotificationStatus.DELIVERED)
                .isRead(false)
                .createdAt(Instant.now())
                .build());
    }

    @Test
    @DisplayName("GET /api/v1/automation/escalation/rules - Admin can list escalation rules")
    void adminCanListEscalationRules() throws Exception {
        mockMvc.perform(get("/api/v1/automation/escalation/rules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].priority").value("CRITICAL"));
    }

    @Test
    @DisplayName("GET /api/v1/automation/escalation/rules - Technician can view escalation rules")
    void technicianCanViewEscalationRules() throws Exception {
        mockMvc.perform(get("/api/v1/automation/escalation/rules")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + technicianToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("PUT /api/v1/automation/escalation/rules/{priority} - Admin updates rule successfully")
    void adminCanUpdateEscalationRule() throws Exception {
        UpdateEscalationRuleRequest req = UpdateEscalationRuleRequest.builder()
                .warningThresholdPercent(70)
                .criticalThresholdPercent(140)
                .autoEscalateUnassigned(true)
                .build();

        mockMvc.perform(put("/api/v1/automation/escalation/rules/CRITICAL")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.warningThresholdPercent").value(70))
                .andExpect(jsonPath("$.data.criticalThresholdPercent").value(140));
    }

    @Test
    @DisplayName("PUT /api/v1/automation/escalation/rules/{priority} - Employee forbidden from updating rules (HTTP 403)")
    void employeeCannotUpdateEscalationRule() throws Exception {
        UpdateEscalationRuleRequest req = UpdateEscalationRuleRequest.builder()
                .warningThresholdPercent(70)
                .build();

        mockMvc.perform(put("/api/v1/automation/escalation/rules/CRITICAL")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + employeeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/v1/automation/escalation/run - Admin triggers SLA scan successfully")
    void adminCanTriggerEscalationScan() throws Exception {
        mockMvc.perform(post("/api/v1/automation/escalation/run")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.scanTimestamp").exists())
                .andExpect(jsonPath("$.data.totalIncidentsEvaluated").isNumber());
    }

    @Test
    @DisplayName("POST /api/v1/automation/escalation/run - Employee cannot trigger scan (HTTP 403)")
    void employeeCannotTriggerEscalationScan() throws Exception {
        mockMvc.perform(post("/api/v1/automation/escalation/run")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + employeeToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/v1/notifications/unread-count - Returns accurate unread count")
    void returnsAccurateUnreadCount() throws Exception {
        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.unreadCount").value(1));
    }

    @Test
    @DisplayName("POST /api/v1/notifications/mark-all-read - Marks notifications read for current user")
    void marksAllNotificationsRead() throws Exception {
        mockMvc.perform(post("/api/v1/notifications/mark-all-read")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.markedCount").value(1));

        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unreadCount").value(0));
    }

    @Test
    @DisplayName("PATCH /api/v1/notifications/{id}/read - Recipient ownership enforced (HTTP 403 when employee tries to mark admin notification)")
    void employeeCannotMarkAdminNotificationAsRead() throws Exception {
        Notification adminNotif = notificationRepository.findAll().stream()
                .filter(n -> n.getRecipient().getId().equals(adminUser.getId()))
                .findFirst()
                .orElseThrow();

        mockMvc.perform(patch("/api/v1/notifications/" + adminNotif.getId() + "/read")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + employeeToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/v1/notifications - Recipient isolation enforced (employee cannot view admin notifications)")
    void recipientIsolationEnforced() throws Exception {
        // Admin has 1 notification, employee has 0
        mockMvc.perform(get("/api/v1/notifications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + employeeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(0)))
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    @DisplayName("POST /api/v1/automation/notifications/retry - Admin can trigger retry, employee forbidden (HTTP 403)")
    void notificationRetrySecurity() throws Exception {
        // Employee forbidden
        mockMvc.perform(post("/api/v1/automation/notifications/retry")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + employeeToken))
                .andExpect(status().isForbidden());

        // Admin allowed
        mockMvc.perform(post("/api/v1/automation/notifications/retry")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.retriedCount").isNumber());
    }
}
