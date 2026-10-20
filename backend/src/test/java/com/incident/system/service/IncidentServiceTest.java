package com.incident.system.service;

import com.incident.system.dto.*;
import com.incident.system.entity.*;
import com.incident.system.exception.ResourceNotFoundException;
import com.incident.system.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IncidentServiceTest {

    @Mock
    private IncidentRepository incidentRepository;
    @Mock
    private IncidentCategoryRepository categoryRepository;
    @Mock
    private SlaPolicyRepository slaPolicyRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private IncidentStatusHistoryRepository statusHistoryRepository;
    @Mock
    private IncidentAssignmentRepository assignmentRepository;
    @Mock
    private IncidentCommentRepository commentRepository;
    @Mock
    private AuditEventRepository auditEventRepository;
    @Mock
    private PriorityCalculator priorityCalculator;
    @Mock
    private TicketNumberGenerator ticketNumberGenerator;
    @Mock
    private AuditService auditService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private IncidentService incidentService;

    private User employeeUser;
    private User otherEmployeeUser;
    private User technicianUser;
    private User adminUser;
    private IncidentCategory category;
    private SlaPolicy slaPolicy;
    private Incident sampleIncident;

    @BeforeEach
    void setUp() {
        Role employeeRole = Role.builder().id(1L).name(RoleName.ROLE_EMPLOYEE).build();
        Role technicianRole = Role.builder().id(2L).name(RoleName.ROLE_TECHNICIAN).build();
        Role adminRole = Role.builder().id(3L).name(RoleName.ROLE_ADMIN).build();

        employeeUser = User.builder()
                .id(10L)
                .username("john.employee")
                .fullName("John Employee")
                .email("john@example.com")
                .role(employeeRole)
                .isActive(true)
                .build();

        otherEmployeeUser = User.builder()
                .id(11L)
                .username("sarah.employee")
                .fullName("Sarah Employee")
                .email("sarah@example.com")
                .role(employeeRole)
                .isActive(true)
                .build();

        technicianUser = User.builder()
                .id(20L)
                .username("tech.dave")
                .fullName("Dave Technician")
                .email("dave@example.com")
                .role(technicianRole)
                .isActive(true)
                .build();

        adminUser = User.builder()
                .id(30L)
                .username("admin.super")
                .fullName("Admin User")
                .email("admin@example.com")
                .role(adminRole)
                .isActive(true)
                .build();

        category = IncidentCategory.builder()
                .id(1L)
                .name("Hardware")
                .slaHours(8)
                .build();

        slaPolicy = SlaPolicy.builder()
                .id(1L)
                .name("High SLA")
                .priority(Priority.HIGH)
                .responseTimeHours(2)
                .resolutionTimeHours(8)
                .build();

        sampleIncident = Incident.builder()
                .id(100L)
                .ticketNumber("INC-20261017-TEST")
                .title("Laptop won't boot")
                .description("Black screen on power on")
                .impact(Impact.HIGH)
                .urgency(Urgency.MEDIUM)
                .priority(Priority.HIGH)
                .status(IncidentStatus.OPEN)
                .category(category)
                .reporter(employeeUser)
                .slaPolicy(slaPolicy)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("Create incident successfully generates ticket number, sets OPEN status and audits")
    void testCreateIncident_Success() {
        CreateIncidentRequest request = CreateIncidentRequest.builder()
                .title("Laptop won't boot")
                .description("Black screen on power on")
                .categoryId(1L)
                .impact(Impact.HIGH)
                .urgency(Urgency.MEDIUM)
                .build();

        when(userRepository.findByUsername("john.employee")).thenReturn(Optional.of(employeeUser));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(priorityCalculator.validateOrCalculate(Impact.HIGH, Urgency.MEDIUM, null)).thenReturn(Priority.HIGH);
        when(slaPolicyRepository.findByPriority(Priority.HIGH)).thenReturn(Optional.of(slaPolicy));
        when(ticketNumberGenerator.generateTicketNumber()).thenReturn("INC-20261017-A1B2");
        when(incidentRepository.save(any(Incident.class))).thenAnswer(inv -> {
            Incident inc = inv.getArgument(0);
            inc.setId(101L);
            return inc;
        });

        IncidentResponse response = incidentService.createIncident(request, "john.employee");

        assertThat(response).isNotNull();
        assertThat(response.getTicketNumber()).isEqualTo("INC-20261017-A1B2");
        assertThat(response.getStatus()).isEqualTo(IncidentStatus.OPEN);
        assertThat(response.getPriority()).isEqualTo(Priority.HIGH);
        assertThat(response.getReporter().getUsername()).isEqualTo("john.employee");

        verify(statusHistoryRepository).save(any(IncidentStatusHistory.class));
        verify(auditService).logEvent(eq("INCIDENT"), eq(101L), eq("INCIDENT_CREATED"), eq(employeeUser), isNull(), anyString());
    }

    @Test
    @DisplayName("Create incident with unknown category throws ResourceNotFoundException")
    void testCreateIncident_UnknownCategoryThrows() {
        CreateIncidentRequest request = CreateIncidentRequest.builder()
                .title("Laptop won't boot")
                .description("Black screen")
                .categoryId(999L)
                .impact(Impact.LOW)
                .urgency(Urgency.LOW)
                .build();

        when(userRepository.findByUsername("john.employee")).thenReturn(Optional.of(employeeUser));
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> incidentService.createIncident(request, "john.employee"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Incident category not found");
    }

    @Test
    @DisplayName("Get incident details: employee allowed for own incident, forbidden for others")
    void testGetIncidentById_OwnershipRestrictions() {
        when(incidentRepository.findById(100L)).thenReturn(Optional.of(sampleIncident));
        when(userRepository.findByUsername("john.employee")).thenReturn(Optional.of(employeeUser));
        when(userRepository.findByUsername("sarah.employee")).thenReturn(Optional.of(otherEmployeeUser));

        // Own incident: OK
        IncidentResponse response = incidentService.getIncidentById(100L, "john.employee");
        assertThat(response.getTicketNumber()).isEqualTo("INC-20261017-TEST");

        // Other employee incident: 403 Forbidden
        assertThatThrownBy(() -> incidentService.getIncidentById(100L, "sarah.employee"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Access denied");
    }

    @Test
    @DisplayName("Technician and Admin can view any incident")
    void testGetIncidentById_TechnicianAndAdminAllowed() {
        when(incidentRepository.findById(100L)).thenReturn(Optional.of(sampleIncident));
        when(userRepository.findByUsername("tech.dave")).thenReturn(Optional.of(technicianUser));
        when(userRepository.findByUsername("admin.super")).thenReturn(Optional.of(adminUser));

        assertThat(incidentService.getIncidentById(100L, "tech.dave")).isNotNull();
        assertThat(incidentService.getIncidentById(100L, "admin.super")).isNotNull();
    }

    @Test
    @DisplayName("Invalid status transition is rejected with clear error")
    void testUpdateIncidentStatus_InvalidTransition() {
        when(incidentRepository.findById(100L)).thenReturn(Optional.of(sampleIncident));
        when(userRepository.findByUsername("tech.dave")).thenReturn(Optional.of(technicianUser));

        // OPEN -> IN_PROGRESS is not an allowed direct transition (must be TRIAGED or ASSIGNED first)
        UpdateIncidentStatusRequest request = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.IN_PROGRESS)
                .build();

        assertThatThrownBy(() -> incidentService.updateIncidentStatus(100L, request, "tech.dave"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid status transition from 'OPEN' to 'IN_PROGRESS'");
    }

    @Test
    @DisplayName("Valid status transition updates status and creates history record")
    void testUpdateIncidentStatus_ValidTransition() {
        when(incidentRepository.findById(100L)).thenReturn(Optional.of(sampleIncident));
        when(userRepository.findByUsername("tech.dave")).thenReturn(Optional.of(technicianUser));
        when(incidentRepository.save(any(Incident.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateIncidentStatusRequest request = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.TRIAGED)
                .reason("Verified hardware issue")
                .build();

        IncidentResponse response = incidentService.updateIncidentStatus(100L, request, "tech.dave");

        assertThat(response.getStatus()).isEqualTo(IncidentStatus.TRIAGED);
        verify(statusHistoryRepository).save(any(IncidentStatusHistory.class));
        verify(auditService).logEvent(eq("INCIDENT"), eq(100L), eq("INCIDENT_STATUS_CHANGED"), eq(technicianUser), eq("OPEN"), eq("TRIAGED"));
    }

    @Test
    @DisplayName("Transition to RESOLVED requires resolution notes")
    void testUpdateIncidentStatus_ResolveRequiresNotes() {
        sampleIncident.setStatus(IncidentStatus.IN_PROGRESS);
        when(incidentRepository.findById(100L)).thenReturn(Optional.of(sampleIncident));
        when(userRepository.findByUsername("tech.dave")).thenReturn(Optional.of(technicianUser));

        UpdateIncidentStatusRequest requestWithoutNotes = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.RESOLVED)
                .resolutionNotes("")
                .build();

        assertThatThrownBy(() -> incidentService.updateIncidentStatus(100L, requestWithoutNotes, "tech.dave"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Resolution notes are required");
    }

    @Test
    @DisplayName("Reopening CLOSED ticket is rejected for employee and technician, allowed for Admin")
    void testUpdateIncidentStatus_ReopeningClosedTicket() {
        sampleIncident.setStatus(IncidentStatus.CLOSED);
        when(incidentRepository.findById(100L)).thenReturn(Optional.of(sampleIncident));
        when(userRepository.findByUsername("john.employee")).thenReturn(Optional.of(employeeUser));
        when(userRepository.findByUsername("tech.dave")).thenReturn(Optional.of(technicianUser));
        when(userRepository.findByUsername("admin.super")).thenReturn(Optional.of(adminUser));
        when(incidentRepository.save(any(Incident.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateIncidentStatusRequest reopenRequest = UpdateIncidentStatusRequest.builder()
                .status(IncidentStatus.OPEN)
                .reason("Admin re-evaluation")
                .build();

        // Employee reopening CLOSED -> AccessDenied
        assertThatThrownBy(() -> incidentService.updateIncidentStatus(100L, reopenRequest, "john.employee"))
                .isInstanceOf(AccessDeniedException.class);

        // Tech reopening CLOSED -> AccessDenied
        assertThatThrownBy(() -> incidentService.updateIncidentStatus(100L, reopenRequest, "tech.dave"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Only Administrators are permitted to reopen a permanently CLOSED incident");

        // Admin reopening CLOSED -> Success
        IncidentResponse adminResponse = incidentService.updateIncidentStatus(100L, reopenRequest, "admin.super");
        assertThat(adminResponse.getStatus()).isEqualTo(IncidentStatus.OPEN);
    }

    @Test
    @DisplayName("Assignment rejected for employee, requires Technician role for assignee")
    void testAssignIncident_ValidationAndPermissions() {
        when(incidentRepository.findById(100L)).thenReturn(Optional.of(sampleIncident));
        when(userRepository.findByUsername("john.employee")).thenReturn(Optional.of(employeeUser));
        when(userRepository.findByUsername("tech.dave")).thenReturn(Optional.of(technicianUser));

        AssignIncidentRequest request = AssignIncidentRequest.builder()
                .assigneeId(20L)
                .notes("Assigning to hardware lead")
                .build();

        // Employee cannot assign
        assertThatThrownBy(() -> incidentService.assignIncident(100L, request, "john.employee"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Employees are not authorized to assign");

        // Assignee cannot be an employee
        when(userRepository.findById(10L)).thenReturn(Optional.of(employeeUser));
        AssignIncidentRequest invalidAssigneeRequest = AssignIncidentRequest.builder()
                .assigneeId(10L)
                .build();
        assertThatThrownBy(() -> incidentService.assignIncident(100L, invalidAssigneeRequest, "tech.dave"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Assignee must have the Technician role");
    }

    @Test
    @DisplayName("Successful assignment updates status to ASSIGNED and records assignment history")
    void testAssignIncident_Success() {
        when(incidentRepository.findById(100L)).thenReturn(Optional.of(sampleIncident));
        when(userRepository.findByUsername("tech.dave")).thenReturn(Optional.of(technicianUser));
        when(userRepository.findById(20L)).thenReturn(Optional.of(technicianUser));
        when(incidentRepository.save(any(Incident.class))).thenAnswer(inv -> inv.getArgument(0));

        AssignIncidentRequest request = AssignIncidentRequest.builder()
                .assigneeId(20L)
                .notes("Primary triage assignment")
                .build();

        IncidentResponse response = incidentService.assignIncident(100L, request, "tech.dave");

        assertThat(response.getAssignee().getUsername()).isEqualTo("tech.dave");
        assertThat(response.getStatus()).isEqualTo(IncidentStatus.ASSIGNED);

        verify(assignmentRepository).save(any(IncidentAssignment.class));
        verify(auditService).logEvent(eq("INCIDENT"), eq(100L), eq("INCIDENT_ASSIGNMENT_CHANGED"), eq(technicianUser), eq("UNASSIGNED"), eq("tech.dave"));
    }

    @Test
    @DisplayName("Employee cannot create internal work notes; Technician can create internal notes")
    void testComments_WorkNotePermissions() {
        when(incidentRepository.findById(100L)).thenReturn(Optional.of(sampleIncident));
        when(userRepository.findByUsername("john.employee")).thenReturn(Optional.of(employeeUser));
        when(userRepository.findByUsername("tech.dave")).thenReturn(Optional.of(technicianUser));
        when(commentRepository.save(any(IncidentComment.class))).thenAnswer(inv -> {
            IncidentComment c = inv.getArgument(0);
            c.setId(50L);
            return c;
        });

        CreateCommentRequest internalNoteRequest = CreateCommentRequest.builder()
                .commentText("Confidential diagnostic notes: suspect motherboard capacitor leakage")
                .isInternal(true)
                .build();

        // Employee attempting to create internal work note -> AccessDenied
        assertThatThrownBy(() -> incidentService.addComment(100L, internalNoteRequest, "john.employee"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Employees are not authorized to create internal work notes");

        // Technician creating internal work note -> Success
        IncidentCommentResponse techComment = incidentService.addComment(100L, internalNoteRequest, "tech.dave");
        assertThat(techComment.isInternal()).isTrue();
        verify(auditService).logEvent(eq("INCIDENT"), eq(100L), eq("INTERNAL_NOTE_ADDED"), eq(technicianUser), isNull(), anyString());
    }

    @Test
    @DisplayName("Employee reading comments only receives public comments, not internal work notes")
    void testComments_EmployeeExcludesInternalNotes() {
        when(incidentRepository.findById(100L)).thenReturn(Optional.of(sampleIncident));
        when(userRepository.findByUsername("john.employee")).thenReturn(Optional.of(employeeUser));

        IncidentComment publicComment = IncidentComment.builder()
                .id(1L)
                .incident(sampleIncident)
                .author(employeeUser)
                .commentText("Laptop handed to IT desk")
                .isInternal(false)
                .createdAt(Instant.now())
                .build();

        when(commentRepository.findByIncidentIdAndIsInternalFalseOrderByCreatedAtAsc(100L))
                .thenReturn(List.of(publicComment));

        List<IncidentCommentResponse> comments = incidentService.getIncidentComments(100L, "john.employee");
        assertThat(comments).hasSize(1);
        assertThat(comments.get(0).isInternal()).isFalse();

        verify(commentRepository).findByIncidentIdAndIsInternalFalseOrderByCreatedAtAsc(100L);
        verify(commentRepository, never()).findByIncidentIdOrderByCreatedAtAsc(100L);
    }

    @Test
    @DisplayName("Get Categories - Returns all mapped category DTOs")
    void getCategories_ReturnsAllCategories() {
        when(categoryRepository.findAll()).thenReturn(List.of(category));

        List<CategoryDto> result = incidentService.getCategories();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(category.getId());
        assertThat(result.get(0).getName()).isEqualTo(category.getName());
        verify(categoryRepository).findAll();
    }
}
