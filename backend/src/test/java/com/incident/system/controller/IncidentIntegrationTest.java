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
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class IncidentIntegrationTest {

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
    private IncidentCommentRepository commentRepository;

    @Autowired
    private IncidentStatusHistoryRepository statusHistoryRepository;

    @Autowired
    private IncidentAssignmentRepository assignmentRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User employee1;
    private User employee2;
    private User technician1;
    private User technician2;
    private User admin1;

    private String employee1Token;
    private String employee2Token;
    private String tech1Token;
    private String adminToken;

    private IncidentCategory hardwareCategory;
    private IncidentCategory softwareCategory;

    @BeforeEach
    void setUp() {
        Role roleEmployee = roleRepository.findByName(RoleName.ROLE_EMPLOYEE)
                .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_EMPLOYEE).description("Employee").build()));
        Role roleTechnician = roleRepository.findByName(RoleName.ROLE_TECHNICIAN)
                .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_TECHNICIAN).description("Technician").build()));
        Role roleAdmin = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_ADMIN).description("Admin").build()));

        employee1 = getOrCreateUser("alice.emp", "alice@example.com", "Alice Smith", roleEmployee);
        employee2 = getOrCreateUser("bob.emp", "bob@example.com", "Bob Jones", roleEmployee);
        technician1 = getOrCreateUser("charlie.tech", "charlie@example.com", "Charlie Tech", roleTechnician);
        technician2 = getOrCreateUser("dan.tech", "dan@example.com", "Dan Tech", roleTechnician);
        admin1 = getOrCreateUser("eve.admin", "eve@example.com", "Eve Admin", roleAdmin);

        employee1Token = generateToken(employee1);
        employee2Token = generateToken(employee2);
        tech1Token = generateToken(technician1);
        adminToken = generateToken(admin1);

        hardwareCategory = categoryRepository.findByName("Hardware")
                .orElseGet(() -> categoryRepository.save(IncidentCategory.builder().name("Hardware").slaHours(8).build()));
        softwareCategory = categoryRepository.findByName("Software & OS")
                .orElseGet(() -> categoryRepository.save(IncidentCategory.builder().name("Software & OS").slaHours(4).build()));

        ensureSlaPolicy(Priority.CRITICAL, 1, 4);
        ensureSlaPolicy(Priority.HIGH, 2, 8);
        ensureSlaPolicy(Priority.MEDIUM, 4, 24);
        ensureSlaPolicy(Priority.LOW, 8, 48);
    }

    private User getOrCreateUser(String username, String email, String fullName, Role role) {
        Optional<User> existing = userRepository.findByUsername(username);
        return existing.orElseGet(() -> userRepository.save(User.builder()
                .username(username)
                .email(email)
                .fullName(fullName)
                .passwordHash("$2a$12$DummyHashForIntegrationTestingPurposesOnly123456789")
                .role(role)
                .isActive(true)
                .department("IT Operations")
                .build()));
    }

    private void ensureSlaPolicy(Priority priority, int respHours, int resolHours) {
        if (slaPolicyRepository.findByPriority(priority).isEmpty()) {
            slaPolicyRepository.save(SlaPolicy.builder()
                    .name(priority.name() + " SLA")
                    .priority(priority)
                    .responseTimeHours(respHours)
                    .resolutionTimeHours(resolHours)
                    .build());
        }
    }

    private String generateToken(User user) {
        return jwtTokenProvider.generateTokenFromUserDetails(UserDetailsImpl.build(user));
    }

    @Test
    @DisplayName("Unauthenticated request to /api/v1/incidents returns 401 Unauthorized")
    void testUnauthenticatedIncidentAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/incidents"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @DisplayName("POST /api/v1/incidents with blank title returns 400 Bad Request with field errors")
    void testCreateIncidentValidationFailure() throws Exception {
        CreateIncidentRequest invalidRequest = CreateIncidentRequest.builder()
                .title("")
                .description("No title provided")
                .categoryId(hardwareCategory.getId())
                .impact(Impact.MEDIUM)
                .urgency(Urgency.MEDIUM)
                .build();

        mockMvc.perform(post("/api/v1/incidents")
                        .header("Authorization", "Bearer " + employee1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors.title").exists());
    }

    @Test
    @DisplayName("POST /api/v1/incidents with contradictory priority returns 400 Bad Request")
    void testCreateIncidentContradictoryPriority() throws Exception {
        CreateIncidentRequest contradictoryRequest = CreateIncidentRequest.builder()
                .title("Minor mouse issue")
                .description("Scroll wheel sticky")
                .categoryId(hardwareCategory.getId())
                .impact(Impact.LOW)
                .urgency(Urgency.LOW)
                .priority(Priority.CRITICAL) // Contradicts matrix: LOW/LOW is LOW
                .build();

        mockMvc.perform(post("/api/v1/incidents")
                        .header("Authorization", "Bearer " + employee1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(contradictoryRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("contradicts the configured impact-and-urgency matrix")));
    }

    @Test
    @DisplayName("POST /api/v1/incidents creates incident with unique ticket number, calculated priority, and OPEN status")
    void testCreateIncidentSuccess() throws Exception {
        CreateIncidentRequest request = CreateIncidentRequest.builder()
                .title("Primary VPN Gateway Unreachable")
                .description("Cannot connect to corporate network via OpenVPN")
                .categoryId(softwareCategory.getId())
                .impact(Impact.HIGH)
                .urgency(Urgency.HIGH)
                .build();

        mockMvc.perform(post("/api/v1/incidents")
                        .header("Authorization", "Bearer " + employee1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.ticketNumber", startsWith("INC-")))
                .andExpect(jsonPath("$.data.priority").value("CRITICAL"))
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.reporter.username").value("alice.emp"))
                .andExpect(jsonPath("$.data.slaPolicy.priority").value("CRITICAL"));
    }

    @Test
    @DisplayName("GET /api/v1/incidents/{id}: Employee can view own, but receives 403 on another employee's incident")
    void testObjectLevelAccessRestrictionsOnGetIncident() throws Exception {
        // Employee 1 creates an incident
        Incident incident = incidentRepository.save(Incident.builder()
                .ticketNumber("INC-TEST-0001")
                .title("Alice's monitor issue")
                .description("Monitor flickering intermittently")
                .impact(Impact.LOW)
                .urgency(Urgency.LOW)
                .priority(Priority.LOW)
                .status(IncidentStatus.OPEN)
                .category(hardwareCategory)
                .reporter(employee1)
                .build());

        // Alice (owner) views: 200 OK
        mockMvc.perform(get("/api/v1/incidents/" + incident.getId())
                        .header("Authorization", "Bearer " + employee1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ticketNumber").value("INC-TEST-0001"));

        // Bob (other employee) views: 403 Forbidden
        mockMvc.perform(get("/api/v1/incidents/" + incident.getId())
                        .header("Authorization", "Bearer " + employee2Token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message", containsString("Access denied")));

        // Charlie (Technician) views: 200 OK
        mockMvc.perform(get("/api/v1/incidents/" + incident.getId())
                        .header("Authorization", "Bearer " + tech1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ticketNumber").value("INC-TEST-0001"));

        // Eve (Admin) views: 200 OK
        mockMvc.perform(get("/api/v1/incidents/" + incident.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ticketNumber").value("INC-TEST-0001"));
    }

    @Test
    @DisplayName("GET /api/v1/incidents: Employee listing only includes own tickets; Technician sees all with filters")
    void testIncidentPaginationAndFiltering() throws Exception {
        // Create 2 tickets for Alice, 1 for Bob
        incidentRepository.save(Incident.builder()
                .ticketNumber("INC-ALICE-1")
                .title("Alice First Ticket")
                .description("Description 1")
                .impact(Impact.MEDIUM)
                .urgency(Urgency.MEDIUM)
                .priority(Priority.MEDIUM)
                .status(IncidentStatus.OPEN)
                .category(hardwareCategory)
                .reporter(employee1)
                .build());

        incidentRepository.save(Incident.builder()
                .ticketNumber("INC-ALICE-2")
                .title("Alice Second Ticket")
                .description("Description 2")
                .impact(Impact.HIGH)
                .urgency(Urgency.HIGH)
                .priority(Priority.CRITICAL)
                .status(IncidentStatus.ASSIGNED)
                .category(softwareCategory)
                .reporter(employee1)
                .build());

        incidentRepository.save(Incident.builder()
                .ticketNumber("INC-BOB-1")
                .title("Bob Exclusive Ticket")
                .description("Bob issue")
                .impact(Impact.LOW)
                .urgency(Urgency.LOW)
                .priority(Priority.LOW)
                .status(IncidentStatus.OPEN)
                .category(hardwareCategory)
                .reporter(employee2)
                .build());

        // Alice lists tickets: only sees her 2 tickets
        mockMvc.perform(get("/api/v1/incidents")
                        .header("Authorization", "Bearer " + employee1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.content[*].ticketNumber", containsInAnyOrder("INC-ALICE-1", "INC-ALICE-2")));

        // Technician lists tickets with filter priority=CRITICAL: sees Alice's critical ticket
        mockMvc.perform(get("/api/v1/incidents?priority=CRITICAL")
                        .header("Authorization", "Bearer " + tech1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].ticketNumber").value("INC-ALICE-2"));

        // Technician search filter by ticket number
        mockMvc.perform(get("/api/v1/incidents?search=BOB")
                        .header("Authorization", "Bearer " + tech1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].ticketNumber").value("INC-BOB-1"));
    }

    @Test
    @DisplayName("PATCH /api/v1/incidents/{id}/assignment: Technician can assign; Employee receives 403; Non-tech rejected")
    void testIncidentAssignmentLifecycle() throws Exception {
        Incident incident = incidentRepository.save(Incident.builder()
                .ticketNumber("INC-ASSIGN-01")
                .title("Broken docking station")
                .description("Docking station HDMI not outputting")
                .impact(Impact.MEDIUM)
                .urgency(Urgency.MEDIUM)
                .priority(Priority.MEDIUM)
                .status(IncidentStatus.OPEN)
                .category(hardwareCategory)
                .reporter(employee1)
                .build());

        // Employee attempts assignment: 403 Forbidden
        AssignIncidentRequest assignReq = AssignIncidentRequest.builder()
                .assigneeId(technician1.getId())
                .notes("Employee trying to self-assign")
                .build();

        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/assignment")
                        .header("Authorization", "Bearer " + employee1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isForbidden());

        // Technician assigns to non-technician (Employee): 400 Bad Request
        AssignIncidentRequest invalidAssigneeReq = AssignIncidentRequest.builder()
                .assigneeId(employee2.getId())
                .notes("Invalid assignee test")
                .build();

        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/assignment")
                        .header("Authorization", "Bearer " + tech1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidAssigneeReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Assignee must have the Technician role")));

        // Technician assigns to Technician 2: 200 OK
        AssignIncidentRequest validReq = AssignIncidentRequest.builder()
                .assigneeId(technician2.getId())
                .notes("Reassigning to hardware specialist Dan")
                .build();

        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/assignment")
                        .header("Authorization", "Bearer " + tech1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.data.assignee.username").value("dan.tech"));

        // Verify assignment history is persisted
        assertThat(assignmentRepository.findByIncidentIdOrderByAssignedAtDesc(incident.getId())).hasSize(1);
    }

    @Test
    @DisplayName("PATCH /api/v1/incidents/{id}/status: Valid transitions, resolution notes requirement, and closed ticket reopening")
    void testStatusTransitionsLifecycle() throws Exception {
        Incident incident = incidentRepository.save(Incident.builder()
                .ticketNumber("INC-STATUS-01")
                .title("Email client crashing")
                .description("Outlook crashes on launch")
                .impact(Impact.HIGH)
                .urgency(Urgency.MEDIUM)
                .priority(Priority.HIGH)
                .status(IncidentStatus.OPEN)
                .category(softwareCategory)
                .reporter(employee1)
                .build());

        // 1. Invalid transition: OPEN directly to RESOLVED -> 400 Bad Request
        UpdateIncidentStatusRequest invalidTrans = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.RESOLVED)
                .resolutionNotes("Quick fix")
                .build();
        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/status")
                        .header("Authorization", "Bearer " + tech1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidTrans)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid status transition from 'OPEN' to 'RESOLVED'")));

        // 2. Valid transition: OPEN -> TRIAGED -> 200 OK
        UpdateIncidentStatusRequest triageReq = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.TRIAGED)
                .reason("Categorized under Software & OS")
                .build();
        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/status")
                        .header("Authorization", "Bearer " + tech1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(triageReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("TRIAGED"));

        // 3. Valid transition: TRIAGED -> IN_PROGRESS -> 200 OK
        UpdateIncidentStatusRequest inProgressReq = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.IN_PROGRESS)
                .reason("Beginning registry rebuild")
                .build();
        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/status")
                        .header("Authorization", "Bearer " + tech1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inProgressReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));

        // 4. IN_PROGRESS -> RESOLVED without notes -> 400 Bad Request
        UpdateIncidentStatusRequest resolveWithoutNotes = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.RESOLVED)
                .build();
        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/status")
                        .header("Authorization", "Bearer " + tech1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resolveWithoutNotes)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Resolution notes are required")));

        // 5. IN_PROGRESS -> RESOLVED with notes -> 200 OK
        UpdateIncidentStatusRequest resolveWithNotes = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.RESOLVED)
                .resolutionNotes("Reinstalled corrupted Outlook profile")
                .build();
        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/status")
                        .header("Authorization", "Bearer " + tech1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resolveWithNotes)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.resolvedAt").isNotEmpty());

        // 6. Employee confirms resolution: RESOLVED -> CLOSED -> 200 OK
        UpdateIncidentStatusRequest closeReq = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.CLOSED)
                .reason("Confirmed working on my workstation")
                .build();
        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/status")
                        .header("Authorization", "Bearer " + employee1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(closeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED"));

        // 7. Employee attempting to reopen CLOSED incident -> 403 Forbidden
        UpdateIncidentStatusRequest reopenReq = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.OPEN)
                .reason("Problem returned")
                .build();
        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/status")
                        .header("Authorization", "Bearer " + employee1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reopenReq)))
                .andExpect(status().isForbidden());

        // 8. Admin reopens CLOSED incident -> 200 OK
        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reopenReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.resolvedAt").doesNotExist());
    }

    @Test
    @DisplayName("Comments and Work Notes: Employee prohibited from creating internal notes; Internal notes hidden from employee")
    void testCommentsAndInternalWorkNotesConfidentiality() throws Exception {
        Incident incident = incidentRepository.save(Incident.builder()
                .ticketNumber("INC-COMM-01")
                .title("Printer jam error")
                .description("Office printer displays error 50.1")
                .impact(Impact.LOW)
                .urgency(Urgency.LOW)
                .priority(Priority.LOW)
                .status(IncidentStatus.OPEN)
                .category(hardwareCategory)
                .reporter(employee1)
                .build());

        // 1. Employee creates public comment -> 201 Created
        CreateCommentRequest publicComment = CreateCommentRequest.builder()
                .commentText("Power cycled the printer, but error persisted.")
                .isInternal(false)
                .build();
        mockMvc.perform(post("/api/v1/incidents/" + incident.getId() + "/comments")
                        .header("Authorization", "Bearer " + employee1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(publicComment)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.commentText").value("Power cycled the printer, but error persisted."))
                .andExpect(jsonPath("$.data.internal").value(false));

        // 2. Employee tries to create internal work note -> 403 Forbidden
        CreateCommentRequest illegalInternalNote = CreateCommentRequest.builder()
                .commentText("Attempting to bypass technician work note restriction.")
                .isInternal(true)
                .build();
        mockMvc.perform(post("/api/v1/incidents/" + incident.getId() + "/comments")
                        .header("Authorization", "Bearer " + employee1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(illegalInternalNote)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Employees are not authorized to create internal work notes")));

        // 3. Technician creates internal work note -> 201 Created
        CreateCommentRequest techInternalNote = CreateCommentRequest.builder()
                .commentText("INTERNAL: Fuser heating element failed; replacement ordered under warranty PO #99481.")
                .isInternal(true)
                .build();
        mockMvc.perform(post("/api/v1/incidents/" + incident.getId() + "/comments")
                        .header("Authorization", "Bearer " + tech1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(techInternalNote)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.internal").value(true));

        // 4. Employee GET /comments -> ONLY 1 public comment returned (confidential internal note is filtered out)
        mockMvc.perform(get("/api/v1/incidents/" + incident.getId() + "/comments")
                        .header("Authorization", "Bearer " + employee1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].commentText").value("Power cycled the printer, but error persisted."))
                .andExpect(jsonPath("$.data[0].internal").value(false));

        // 5. Technician GET /comments -> BOTH public and internal comments returned
        mockMvc.perform(get("/api/v1/incidents/" + incident.getId() + "/comments")
                        .header("Authorization", "Bearer " + tech1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[*].internal", containsInAnyOrder(false, true)));
    }

    @Test
    @DisplayName("GET /api/v1/incidents/{id}/history returns status, assignment and audit logs; forbidden to unauthorized users")
    void testIncidentHistoryAuditConsistency() throws Exception {
        Incident incident = incidentRepository.save(Incident.builder()
                .ticketNumber("INC-HIST-01")
                .title("Badge scanner offline")
                .description("South gate badge scanner dead")
                .impact(Impact.MEDIUM)
                .urgency(Urgency.MEDIUM)
                .priority(Priority.MEDIUM)
                .status(IncidentStatus.OPEN)
                .category(hardwareCategory)
                .reporter(employee1)
                .build());

        // Status history entry
        statusHistoryRepository.save(IncidentStatusHistory.builder()
                .incident(incident)
                .oldStatus(null)
                .newStatus(IncidentStatus.OPEN)
                .changedBy(employee1)
                .changeReason("Ticket created")
                .build());

        // Assignment entry
        assignmentRepository.save(IncidentAssignment.builder()
                .incident(incident)
                .assignedBy(technician1)
                .assignedTo(technician1)
                .assignmentNotes("Initial intake")
                .build());

        // Audit event
        auditEventRepository.save(AuditEvent.builder()
                .entityType("INCIDENT")
                .entityId(incident.getId())
                .action("INCIDENT_CREATED")
                .performedBy(employee1)
                .newState("Created")
                .build());

        // Alice (owner) views history: 200 OK
        mockMvc.perform(get("/api/v1/incidents/" + incident.getId() + "/history")
                        .header("Authorization", "Bearer " + employee1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.statusHistory", hasSize(1)))
                .andExpect(jsonPath("$.data.assignmentHistory", hasSize(1)))
                .andExpect(jsonPath("$.data.auditEvents", hasSize(1)));

        // Bob (other employee) receives 403 Forbidden
        mockMvc.perform(get("/api/v1/incidents/" + incident.getId() + "/history")
                        .header("Authorization", "Bearer " + employee2Token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/v1/incidents/{id}: Employee can update while OPEN; forbidden once IN_PROGRESS; Tech can update permitted fields")
    void testPutIncidentUpdateRestrictions() throws Exception {
        Incident incident = incidentRepository.save(Incident.builder()
                .ticketNumber("INC-PUT-01")
                .title("Initial Title")
                .description("Initial Description")
                .impact(Impact.LOW)
                .urgency(Urgency.LOW)
                .priority(Priority.LOW)
                .status(IncidentStatus.OPEN)
                .category(hardwareCategory)
                .reporter(employee1)
                .build());

        // 1. Employee updates title while ticket is OPEN -> 200 OK
        UpdateIncidentRequest empUpdate = UpdateIncidentRequest.builder()
                .title("Updated Title by Employee")
                .description("Updated Description with more logs")
                .build();

        mockMvc.perform(put("/api/v1/incidents/" + incident.getId())
                        .header("Authorization", "Bearer " + employee1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(empUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated Title by Employee"));

        // 2. Employee 2 attempts to update Employee 1's incident -> 403 Forbidden
        mockMvc.perform(put("/api/v1/incidents/" + incident.getId())
                        .header("Authorization", "Bearer " + employee2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(empUpdate)))
                .andExpect(status().isForbidden());

        // 3. Status changes to IN_PROGRESS
        incident.setStatus(IncidentStatus.IN_PROGRESS);
        incidentRepository.save(incident);

        // Employee attempts to update while IN_PROGRESS -> 403 Forbidden
        mockMvc.perform(put("/api/v1/incidents/" + incident.getId())
                        .header("Authorization", "Bearer " + employee1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(empUpdate)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("cannot edit incident details once work has commenced")));

        // 4. Technician updates impact & urgency -> priority automatically recalculated
        UpdateIncidentRequest techUpdate = UpdateIncidentRequest.builder()
                .impact(Impact.HIGH)
                .urgency(Urgency.HIGH)
                .categoryId(softwareCategory.getId())
                .build();

        mockMvc.perform(put("/api/v1/incidents/" + incident.getId())
                        .header("Authorization", "Bearer " + tech1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(techUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.priority").value("CRITICAL"))
                .andExpect(jsonPath("$.data.category.name").value("Software & OS"));
    }

    @Test
    @DisplayName("Transaction Rollback: Operations that fail midway leave zero orphaned state or history")
    void testTransactionRollbackOnFailure() throws Exception {
        long initialIncidentCount = incidentRepository.count();
        long initialStatusHistoryCount = statusHistoryRepository.count();

        // 1. Creation failure (unknown category) leaves no incident or status history
        CreateIncidentRequest failedReq = CreateIncidentRequest.builder()
                .title("Should fail rollback test")
                .description("Invalid category reference")
                .categoryId(999999L)
                .impact(Impact.MEDIUM)
                .urgency(Urgency.MEDIUM)
                .build();

        mockMvc.perform(post("/api/v1/incidents")
                        .header("Authorization", "Bearer " + employee1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(failedReq)))
                .andExpect(status().isNotFound());

        assertThat(incidentRepository.count()).isEqualTo(initialIncidentCount);
        assertThat(statusHistoryRepository.count()).isEqualTo(initialStatusHistoryCount);

        // 2. Status update failure leaves status and history unchanged
        Incident incident = incidentRepository.save(Incident.builder()
                .ticketNumber("INC-ROLLBACK-01")
                .title("Rollback Verification Ticket")
                .description("Testing atomic state preservation")
                .impact(Impact.LOW)
                .urgency(Urgency.LOW)
                .priority(Priority.LOW)
                .status(IncidentStatus.OPEN)
                .category(hardwareCategory)
                .reporter(employee1)
                .build());

        long historyCountBefore = statusHistoryRepository.count();

        // Attempt illegal transition OPEN -> RESOLVED
        UpdateIncidentStatusRequest illegalTransition = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.RESOLVED)
                .resolutionNotes("Quick fix")
                .build();

        mockMvc.perform(patch("/api/v1/incidents/" + incident.getId() + "/status")
                        .header("Authorization", "Bearer " + tech1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(illegalTransition)))
                .andExpect(status().isBadRequest());

        // Status unchanged and no orphaned status history entry written
        Incident reloaded = incidentRepository.findById(incident.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(IncidentStatus.OPEN);
        assertThat(statusHistoryRepository.count()).isEqualTo(historyCountBefore);
    }

    @Test
    @DisplayName("Get Categories - Authenticated user can fetch all incident categories")
    void getCategories_Authenticated_Success() throws Exception {
        mockMvc.perform(get("/api/v1/incidents/categories")
                        .header("Authorization", "Bearer " + employee1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].id").exists())
                .andExpect(jsonPath("$.data[0].name").exists());
    }
}
