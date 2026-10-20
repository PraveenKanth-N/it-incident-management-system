package com.incident.system.service;

import com.incident.system.dto.EscalationRuleDto;
import com.incident.system.dto.EscalationScanResultDto;
import com.incident.system.dto.UpdateEscalationRuleRequest;
import com.incident.system.entity.*;
import com.incident.system.repository.EscalationRuleRepository;
import com.incident.system.repository.IncidentRepository;
import com.incident.system.repository.SlaPolicyRepository;
import com.incident.system.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SlaEscalationServiceTest {

    @Mock
    private IncidentRepository incidentRepository;
    @Mock
    private SlaPolicyRepository slaPolicyRepository;
    @Mock
    private EscalationRuleRepository escalationRuleRepository;
    @Mock
    private AuditService auditService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SlaEscalationService slaEscalationService;

    private User adminUser;
    private User employeeUser;
    private SlaPolicy criticalPolicy;
    private EscalationRule criticalRule;

    @BeforeEach
    void setUp() {
        Role adminRole = Role.builder().id(1L).name(RoleName.ROLE_ADMIN).build();
        Role employeeRole = Role.builder().id(2L).name(RoleName.ROLE_EMPLOYEE).build();

        adminUser = User.builder().id(1L).username("admin.test").role(adminRole).isActive(true).build();
        employeeUser = User.builder().id(2L).username("emp.test").role(employeeRole).isActive(true).build();

        criticalPolicy = SlaPolicy.builder()
                .id(1L)
                .name("Critical SLA")
                .priority(Priority.CRITICAL)
                .resolutionTimeHours(4)
                .build();

        criticalRule = EscalationRule.builder()
                .id(1L)
                .priority(Priority.CRITICAL)
                .warningThresholdPercent(75)
                .breachLevel(2)
                .criticalThresholdPercent(150)
                .autoEscalateUnassigned(true)
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("SLA Warning - Triggers Level 1 when elapsed time reaches warning threshold (75%)")
    void triggersWarningWhenAtWarningThreshold() {
        // Created 3 hours and 5 minutes ago out of 4 hours SLA -> ~77% elapsed
        Instant created = Instant.now().minus(Duration.ofMinutes(185));

        Incident incident = Incident.builder()
                .id(101L)
                .ticketNumber("INC-WARN-01")
                .priority(Priority.CRITICAL)
                .status(IncidentStatus.OPEN)
                .slaPolicy(criticalPolicy)
                .escalationLevel(0)
                .slaBreached(false)
                .createdAt(created)
                .build();

        when(incidentRepository.findActiveIncidentsForEscalation(any())).thenReturn(List.of(incident));
        when(escalationRuleRepository.findByPriority(Priority.CRITICAL)).thenReturn(Optional.of(criticalRule));

        EscalationScanResultDto result = slaEscalationService.runEscalationScan();

        assertThat(result.getWarningsTriggered()).isEqualTo(1);
        assertThat(incident.getEscalationLevel()).isEqualTo(1);
        assertThat(incident.getEscalatedAt()).isNotNull();
        assertThat(incident.isSlaBreached()).isFalse();

        verify(incidentRepository).save(incident);
        verify(auditService).logEvent(eq("INCIDENT"), eq(101L), eq("SLA_WARNING_ESCALATED"), isNull(), any(), any());
        verify(notificationService).notifySlaWarning(eq(incident), anyInt(), anyLong());
    }

    @Test
    @DisplayName("SLA Breach - Triggers Level 2 and marks slaBreached=true when deadline passed")
    void triggersBreachWhenDeadlinePassed() {
        // Created 5 hours ago for a 4-hour SLA -> breached
        Instant created = Instant.now().minus(Duration.ofHours(5));

        Incident incident = Incident.builder()
                .id(102L)
                .ticketNumber("INC-BREACH-02")
                .priority(Priority.CRITICAL)
                .status(IncidentStatus.ASSIGNED)
                .slaPolicy(criticalPolicy)
                .escalationLevel(0)
                .slaBreached(false)
                .createdAt(created)
                .build();

        when(incidentRepository.findActiveIncidentsForEscalation(any())).thenReturn(List.of(incident));
        when(escalationRuleRepository.findByPriority(Priority.CRITICAL)).thenReturn(Optional.of(criticalRule));

        EscalationScanResultDto result = slaEscalationService.runEscalationScan();

        assertThat(result.getBreachesTriggered()).isEqualTo(1);
        assertThat(incident.getEscalationLevel()).isEqualTo(2);
        assertThat(incident.isSlaBreached()).isTrue();

        verify(incidentRepository).save(incident);
        verify(auditService).logEvent(eq("INCIDENT"), eq(102L), eq("SLA_BREACH_ESCALATED"), isNull(), any(), any());
        verify(notificationService).notifySlaBreached(eq(incident));
    }

    @Test
    @DisplayName("Critical Escalation - Triggers Level 3 when elapsed time reaches critical threshold (150%)")
    void triggersCriticalEscalationWhenExceeding150Percent() {
        // Created 7 hours ago for a 4-hour SLA -> 175% elapsed
        Instant created = Instant.now().minus(Duration.ofHours(7));

        Incident incident = Incident.builder()
                .id(103L)
                .ticketNumber("INC-CRIT-03")
                .priority(Priority.CRITICAL)
                .status(IncidentStatus.IN_PROGRESS)
                .slaPolicy(criticalPolicy)
                .escalationLevel(2) // already breached
                .slaBreached(true)
                .createdAt(created)
                .build();

        when(incidentRepository.findActiveIncidentsForEscalation(any())).thenReturn(List.of(incident));
        when(escalationRuleRepository.findByPriority(Priority.CRITICAL)).thenReturn(Optional.of(criticalRule));

        EscalationScanResultDto result = slaEscalationService.runEscalationScan();

        assertThat(result.getCriticalEscalationsTriggered()).isEqualTo(1);
        assertThat(incident.getEscalationLevel()).isEqualTo(3);

        verify(incidentRepository).save(incident);
        verify(auditService).logEvent(eq("INCIDENT"), eq(103L), eq("SLA_CRITICAL_ESCALATION"), isNull(), any(), any());
        verify(notificationService).notifyIncidentEscalated(eq(incident), eq(3), anyString());
    }

    @Test
    @DisplayName("Idempotency - Repeated scans do NOT produce duplicate escalations or audit events")
    void repeatedScansAreIdempotent() {
        // Incident already at Level 2 breach
        Instant created = Instant.now().minus(Duration.ofHours(5));

        Incident incident = Incident.builder()
                .id(104L)
                .ticketNumber("INC-IDEMP-04")
                .priority(Priority.CRITICAL)
                .status(IncidentStatus.ASSIGNED)
                .slaPolicy(criticalPolicy)
                .escalationLevel(2)
                .slaBreached(true)
                .createdAt(created)
                .build();

        when(incidentRepository.findActiveIncidentsForEscalation(any())).thenReturn(List.of(incident));
        when(escalationRuleRepository.findByPriority(Priority.CRITICAL)).thenReturn(Optional.of(criticalRule));

        EscalationScanResultDto result = slaEscalationService.runEscalationScan();

        assertThat(result.getWarningsTriggered()).isEqualTo(0);
        assertThat(result.getBreachesTriggered()).isEqualTo(0);
        assertThat(result.getCriticalEscalationsTriggered()).isEqualTo(0);
        assertThat(result.getNotificationsDispatched()).isEqualTo(0);

        verify(incidentRepository, never()).save(any());
        verify(auditService, never()).logEvent(any(), any(), any(), any(), any(), any());
        verify(notificationService, never()).notifySlaBreached(any());
    }

    @Test
    @DisplayName("Reopened Incidents - Overdue reopened incident without resolvedAt is escalated correctly")
    void reopenedIncidentIsEvaluatedAndEscalated() {
        // Reopened ticket: resolvedAt is null, createdAt was 6 hours ago for a 4-hour SLA
        Incident reopened = Incident.builder()
                .id(105L)
                .ticketNumber("INC-REOPEN-05")
                .priority(Priority.CRITICAL)
                .status(IncidentStatus.OPEN) // reopened
                .slaPolicy(criticalPolicy)
                .resolvedAt(null) // cleared on reopen
                .escalationLevel(0)
                .slaBreached(false)
                .createdAt(Instant.now().minus(Duration.ofMinutes(280)))
                .build();

        when(incidentRepository.findActiveIncidentsForEscalation(any())).thenReturn(List.of(reopened));
        when(escalationRuleRepository.findByPriority(Priority.CRITICAL)).thenReturn(Optional.of(criticalRule));

        EscalationScanResultDto result = slaEscalationService.runEscalationScan();

        assertThat(result.getBreachesTriggered()).isEqualTo(1);
        assertThat(reopened.getEscalationLevel()).isEqualTo(2);
        assertThat(reopened.isSlaBreached()).isTrue();

        verify(incidentRepository).save(reopened);
    }

    @Test
    @DisplayName("Administration - Admin can update escalation rule thresholds")
    void adminCanUpdateEscalationRule() {
        when(userRepository.findByUsername("admin.test")).thenReturn(Optional.of(adminUser));
        when(escalationRuleRepository.findByPriority(Priority.CRITICAL)).thenReturn(Optional.of(criticalRule));
        when(escalationRuleRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateEscalationRuleRequest req = UpdateEscalationRuleRequest.builder()
                .warningThresholdPercent(70)
                .criticalThresholdPercent(140)
                .autoEscalateUnassigned(true)
                .build();

        EscalationRuleDto updated = slaEscalationService.updateEscalationRule(Priority.CRITICAL, req, "admin.test");

        assertThat(updated.getWarningThresholdPercent()).isEqualTo(70);
        assertThat(updated.getCriticalThresholdPercent()).isEqualTo(140);
        verify(escalationRuleRepository).save(criticalRule);
        verify(auditService).logEvent(eq("ESCALATION_RULE"), any(), eq("ESCALATION_RULE_UPDATED"), eq(adminUser), any(), any());
    }

    @Test
    @DisplayName("Administration RBAC - Employee cannot update escalation rule (AccessDeniedException)")
    void employeeCannotUpdateEscalationRule() {
        when(userRepository.findByUsername("emp.test")).thenReturn(Optional.of(employeeUser));

        UpdateEscalationRuleRequest req = UpdateEscalationRuleRequest.builder()
                .warningThresholdPercent(70)
                .build();

        assertThatThrownBy(() -> slaEscalationService.updateEscalationRule(Priority.CRITICAL, req, "emp.test"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Only Administrators");

        verify(escalationRuleRepository, never()).save(any());
    }

    @Test
    @DisplayName("SLA Boundary: Just BEFORE deadline (95% elapsed) triggers Level 1 Warning, NOT Breach")
    void boundaryJustBeforeDeadlineTriggersWarningNotBreach() {
        // 4 hours = 240 minutes. 95% = 228 minutes. 12 minutes remaining.
        Instant created = Instant.now().minus(Duration.ofMinutes(228));

        Incident incident = Incident.builder()
                .id(201L)
                .ticketNumber("INC-BOUND-BEFORE")
                .priority(Priority.CRITICAL)
                .status(IncidentStatus.IN_PROGRESS)
                .slaPolicy(criticalPolicy)
                .escalationLevel(0)
                .slaBreached(false)
                .createdAt(created)
                .build();

        when(incidentRepository.findActiveIncidentsForEscalation(any())).thenReturn(List.of(incident));
        when(escalationRuleRepository.findByPriority(Priority.CRITICAL)).thenReturn(Optional.of(criticalRule));

        EscalationScanResultDto result = slaEscalationService.runEscalationScan();

        assertThat(result.getWarningsTriggered()).isEqualTo(1);
        assertThat(result.getBreachesTriggered()).isEqualTo(0);
        assertThat(result.getCriticalEscalationsTriggered()).isEqualTo(0);
        assertThat(incident.getEscalationLevel()).isEqualTo(1);
        assertThat(incident.isSlaBreached()).isFalse();

        verify(notificationService).notifySlaWarning(eq(incident), eq(95), anyLong());
        verify(notificationService, never()).notifySlaBreached(any());
    }

    @Test
    @DisplayName("SLA Boundary: Just AFTER deadline (100.4% elapsed) triggers Level 2 Breach")
    void boundaryJustAfterDeadlineTriggersBreach() {
        // 4 hours = 240 minutes. 241 minutes elapsed -> 1 minute past deadline
        Instant created = Instant.now().minus(Duration.ofMinutes(241));

        Incident incident = Incident.builder()
                .id(202L)
                .ticketNumber("INC-BOUND-AFTER")
                .priority(Priority.CRITICAL)
                .status(IncidentStatus.IN_PROGRESS)
                .slaPolicy(criticalPolicy)
                .escalationLevel(0)
                .slaBreached(false)
                .createdAt(created)
                .build();

        when(incidentRepository.findActiveIncidentsForEscalation(any())).thenReturn(List.of(incident));
        when(escalationRuleRepository.findByPriority(Priority.CRITICAL)).thenReturn(Optional.of(criticalRule));

        EscalationScanResultDto result = slaEscalationService.runEscalationScan();

        assertThat(result.getWarningsTriggered()).isEqualTo(0);
        assertThat(result.getBreachesTriggered()).isEqualTo(1);
        assertThat(incident.getEscalationLevel()).isEqualTo(2);
        assertThat(incident.isSlaBreached()).isTrue();

        verify(notificationService).notifySlaBreached(eq(incident));
    }

    @Test
    @DisplayName("Priority Specific Rules: LOW priority incident with 5h elapsed is neither warned nor breached")
    void lowPriorityIncidentRespectsLowSlaTarget() {
        SlaPolicy lowPolicy = SlaPolicy.builder()
                .id(4L)
                .name("Low SLA")
                .priority(Priority.LOW)
                .resolutionTimeHours(72)
                .build();

        EscalationRule lowRule = EscalationRule.builder()
                .id(4L)
                .priority(Priority.LOW)
                .warningThresholdPercent(80)
                .breachLevel(2)
                .criticalThresholdPercent(160)
                .isActive(true)
                .build();

        // 5 hours = 300 minutes. 72 hours = 4320 minutes. 300 / 4320 = ~6.9% elapsed
        Instant created = Instant.now().minus(Duration.ofHours(5));

        Incident incident = Incident.builder()
                .id(203L)
                .ticketNumber("INC-LOW-01")
                .priority(Priority.LOW)
                .status(IncidentStatus.OPEN)
                .slaPolicy(lowPolicy)
                .escalationLevel(0)
                .slaBreached(false)
                .createdAt(created)
                .build();

        when(incidentRepository.findActiveIncidentsForEscalation(any())).thenReturn(List.of(incident));
        when(escalationRuleRepository.findByPriority(Priority.LOW)).thenReturn(Optional.of(lowRule));

        EscalationScanResultDto result = slaEscalationService.runEscalationScan();

        assertThat(result.getWarningsTriggered()).isEqualTo(0);
        assertThat(result.getBreachesTriggered()).isEqualTo(0);
        assertThat(result.getCriticalEscalationsTriggered()).isEqualTo(0);
        assertThat(incident.getEscalationLevel()).isEqualTo(0);
        assertThat(incident.isSlaBreached()).isFalse();

        verify(notificationService, never()).notifySlaWarning(any(), anyInt(), anyLong());
        verify(notificationService, never()).notifySlaBreached(any());
    }
}
