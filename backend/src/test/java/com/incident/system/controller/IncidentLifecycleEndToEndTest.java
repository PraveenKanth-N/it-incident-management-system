package com.incident.system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incident.system.dto.*;
import com.incident.system.entity.*;
import com.incident.system.repository.*;
import com.incident.system.security.JwtTokenProvider;
import com.incident.system.security.UserDetailsImpl;
import org.junit.jupiter.api.AfterEach;
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

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class IncidentLifecycleEndToEndTest {

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
    private IncidentStatusHistoryRepository statusHistoryRepository;

    @Autowired
    private IncidentAssignmentRepository assignmentRepository;

    @Autowired
    private IncidentCommentRepository commentRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User admin;
    private User tech;
    private User employee;

    private String adminToken;
    private String techToken;
    private String employeeToken;

    private IncidentCategory testCategory;
    private final List<Long> createdIncidentIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_ADMIN, "Admin")));
        Role techRole = roleRepository.findByName(RoleName.ROLE_TECHNICIAN)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_TECHNICIAN, "Tech")));
        Role empRole = roleRepository.findByName(RoleName.ROLE_EMPLOYEE)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_EMPLOYEE, "Employee")));

        long suffix = System.nanoTime();

        admin = userRepository.save(User.builder()
                .username("e2e.admin." + suffix)
                .email("e2e.admin." + suffix + "@resolv.local")
                .fullName("E2E Administrator")
                .department("IT Operations")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .role(adminRole)
                .isActive(true)
                .createdAt(Instant.now())
                .build());

        tech = userRepository.save(User.builder()
                .username("e2e.tech." + suffix)
                .email("e2e.tech." + suffix + "@resolv.local")
                .fullName("E2E Lead Technician")
                .department("Service Desk")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .role(techRole)
                .isActive(true)
                .createdAt(Instant.now())
                .build());

        employee = userRepository.save(User.builder()
                .username("e2e.emp." + suffix)
                .email("e2e.emp." + suffix + "@resolv.local")
                .fullName("E2E Employee User")
                .department("Finance")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .role(empRole)
                .isActive(true)
                .createdAt(Instant.now())
                .build());

        testCategory = categoryRepository.save(IncidentCategory.builder()
                .name("Core Banking Infrastructure " + suffix)
                .description("Production ledger and payment rails")
                .slaHours(4)
                .isActive(true)
                .build());

        adminToken = "Bearer " + jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(admin));
        techToken = "Bearer " + jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(tech));
        employeeToken = "Bearer " + jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(employee));
    }

    @AfterEach
    void tearDown() {
        for (Long incId : createdIncidentIds) {
            commentRepository.deleteAll(commentRepository.findByIncidentIdOrderByCreatedAtAsc(incId));
            assignmentRepository.deleteAll(assignmentRepository.findByIncidentIdOrderByAssignedAtDesc(incId));
            statusHistoryRepository.deleteAll(statusHistoryRepository.findByIncidentIdOrderByCreatedAtDesc(incId));
            notificationRepository.deleteAll(notificationRepository.findByIncidentId(incId));
            auditEventRepository.deleteAll(auditEventRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("INCIDENT", incId));
            incidentRepository.deleteById(incId);
        }
        categoryRepository.delete(testCategory);
        userRepository.deleteAll(List.of(admin, tech, employee));
    }

    @Test
    @DisplayName("E2E Regression - Full ITIL Incident Lifecycle: Create -> Assign -> In-Progress -> Internal Note -> Resolve -> Close -> Reopen")
    void testCompleteIncidentLifecycleE2E() throws Exception {
        // Step 1: Employee reports incident (HIGH impact + HIGH urgency -> CRITICAL priority auto-calculated)
        CreateIncidentRequest createReq = CreateIncidentRequest.builder()
                .title("Database connection pool saturated in Payment Gateway")
                .description("Transactions failing with JDBC timeout across all replicas")
                .categoryId(testCategory.getId())
                .impact(Impact.HIGH)
                .urgency(Urgency.HIGH)
                .build();

        MvcResult createResult = mockMvc.perform(post("/api/v1/incidents")
                        .header(HttpHeaders.AUTHORIZATION, employeeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.priority").value("CRITICAL"))
                .andExpect(jsonPath("$.data.ticketNumber").isNotEmpty())
                .andReturn();

        String createJson = createResult.getResponse().getContentAsString();
        Long incidentId = objectMapper.readTree(createJson).get("data").get("id").asLong();
        createdIncidentIds.add(incidentId);

        // Step 2: Technician assigns ticket to themselves (auto-advances to ASSIGNED)
        AssignIncidentRequest assignReq = AssignIncidentRequest.builder()
                .assigneeId(tech.getId())
                .notes("Claiming ticket for investigation")
                .build();

        mockMvc.perform(patch("/api/v1/incidents/{id}/assignment", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, techToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.data.assignee.id").value(tech.getId()));

        // Step 3: Technician moves incident to IN_PROGRESS
        UpdateIncidentStatusRequest inProgressReq = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.IN_PROGRESS)
                .reason("Investigating connection leak in replica pool")
                .build();

        mockMvc.perform(patch("/api/v1/incidents/{id}/status", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, techToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inProgressReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));

        // Step 4: Technician logs confidential internal work note
        CreateCommentRequest internalNoteReq = CreateCommentRequest.builder()
                .commentText("Identified unclosed Hibernate session in BatchPaymentJob. Scaling pool to 50 connections.")
                .isInternal(true)
                .build();

        mockMvc.perform(post("/api/v1/incidents/{id}/comments", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, techToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(internalNoteReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.internal").value(true));

        // Step 5: Employee verifies internal work note is hidden from employee view
        mockMvc.perform(get("/api/v1/incidents/{id}/comments", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, employeeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        // Step 6: Employee posts public update
        CreateCommentRequest publicCommentReq = CreateCommentRequest.builder()
                .commentText("Transactions are still being rejected by customers.")
                .isInternal(false)
                .build();

        mockMvc.perform(post("/api/v1/incidents/{id}/comments", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, employeeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(publicCommentReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.internal").value(false));

        // Technician verifies public comment is visible alongside internal note
        mockMvc.perform(get("/api/v1/incidents/{id}/comments", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, techToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));

        // Step 7: Attempting resolution without notes is rejected with HTTP 400
        UpdateIncidentStatusRequest emptyResolveReq = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.RESOLVED)
                .resolutionNotes("")
                .build();

        mockMvc.perform(patch("/api/v1/incidents/{id}/status", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, techToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emptyResolveReq)))
                .andExpect(status().isBadRequest());

        // Step 8: Technician resolves with required resolution notes
        UpdateIncidentStatusRequest resolveReq = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.RESOLVED)
                .resolutionNotes("Applied hotfix patch v2.4.1 to release leaked sessions. Gateway metrics normalized.")
                .build();

        mockMvc.perform(patch("/api/v1/incidents/{id}/status", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, techToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resolveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.resolvedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.resolutionNotes").isNotEmpty());

        // Step 9: Employee closes the ticket
        UpdateIncidentStatusRequest closeReq = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.CLOSED)
                .reason("Confirmed resolved on customer end")
                .build();

        mockMvc.perform(patch("/api/v1/incidents/{id}/status", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, employeeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(closeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED"));

        // Step 10: Technician attempts to reopen CLOSED ticket -> rejected with HTTP 403 Forbidden
        UpdateIncidentStatusRequest reopenReq = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.OPEN)
                .reason("Technician trying to reopen closed ticket")
                .build();

        mockMvc.perform(patch("/api/v1/incidents/{id}/status", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, techToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reopenReq)))
                .andExpect(status().isForbidden());

        // Step 11: Administrator reopens CLOSED ticket -> successfully transitions to OPEN and clears resolvedAt
        mockMvc.perform(patch("/api/v1/incidents/{id}/status", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reopenReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.resolvedAt").doesNotExist());

        // Step 12: Verify immutable audit history trail is populated
        mockMvc.perform(get("/api/v1/incidents/{id}/history", incidentId)
                        .header(HttpHeaders.AUTHORIZATION, adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.statusHistory").isNotEmpty())
                .andExpect(jsonPath("$.data.assignmentHistory").isNotEmpty())
                .andExpect(jsonPath("$.data.auditEvents").isNotEmpty());
    }
}
