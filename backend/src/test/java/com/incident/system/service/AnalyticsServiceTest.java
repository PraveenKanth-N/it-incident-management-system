package com.incident.system.service;

import com.incident.system.dto.analytics.*;
import com.incident.system.entity.*;
import com.incident.system.repository.IncidentCategoryRepository;
import com.incident.system.repository.IncidentRepository;
import com.incident.system.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private IncidentCategoryRepository categoryRepository;

    @InjectMocks
    private AnalyticsService analyticsService;

    private User adminUser;
    private User techUser;
    private User employeeUser;
    private IncidentCategory softwareCategory;
    private IncidentCategory networkCategory;
    private SlaPolicy criticalSla;
    private SlaPolicy highSla;

    @BeforeEach
    void setUp() {
        Role adminRole = Role.builder().id(1L).name(RoleName.ROLE_ADMIN).build();
        Role techRole = Role.builder().id(2L).name(RoleName.ROLE_TECHNICIAN).build();
        Role empRole = Role.builder().id(3L).name(RoleName.ROLE_EMPLOYEE).build();

        adminUser = User.builder().id(1L).username("admin.super").role(adminRole).build();
        techUser = User.builder().id(2L).username("tech.dave").fullName("Dave Technician").role(techRole).department("NOC").build();
        employeeUser = User.builder().id(3L).username("alice.emp").role(empRole).department("Finance").build();

        softwareCategory = IncidentCategory.builder().id(1L).name("Software & OS").slaHours(4).build();
        networkCategory = IncidentCategory.builder().id(2L).name("Network & VPN").slaHours(2).build();

        criticalSla = SlaPolicy.builder().id(1L).name("Critical SLA").priority(Priority.CRITICAL).resolutionTimeHours(4).build();
        highSla = SlaPolicy.builder().id(2L).name("High SLA").priority(Priority.HIGH).resolutionTimeHours(8).build();
    }

    @Test
    @DisplayName("Dashboard Metrics: Should aggregate status, priority, category, unassigned, and SLA totals correctly")
    void testGetDashboardMetrics() {
        when(userRepository.findByUsername("admin.super")).thenReturn(Optional.of(adminUser));
        when(categoryRepository.findAll()).thenReturn(List.of(softwareCategory, networkCategory));

        Instant now = Instant.now();

        // Incident 1: Critical, Open, unassigned, software, created 1 hour ago (SLA 4h -> on time, approaching)
        Incident inc1 = Incident.builder()
                .id(1L).ticketNumber("INC-001").title("Server Crash")
                .status(IncidentStatus.OPEN).priority(Priority.CRITICAL)
                .category(softwareCategory).slaPolicy(criticalSla).reporter(employeeUser).assignee(null)
                .createdAt(now.minus(Duration.ofHours(3))) // 1 hour remaining -> approaching deadline
                .build();

        // Incident 2: High, Resolved on time, assigned to Dave
        Incident inc2 = Incident.builder()
                .id(2L).ticketNumber("INC-002").title("VPN Slow")
                .status(IncidentStatus.RESOLVED).priority(Priority.HIGH)
                .category(networkCategory).slaPolicy(highSla).reporter(employeeUser).assignee(techUser)
                .createdAt(now.minus(Duration.ofHours(5)))
                .resolvedAt(now.minus(Duration.ofHours(1))) // resolved in 4 hours, SLA is 8h -> on time
                .resolutionNotes("Reset firewall route")
                .build();

        // Incident 3: Critical, In Progress, breached
        Incident inc3 = Incident.builder()
                .id(3L).ticketNumber("INC-003").title("DB Deadlock")
                .status(IncidentStatus.IN_PROGRESS).priority(Priority.CRITICAL)
                .category(softwareCategory).slaPolicy(criticalSla).reporter(employeeUser).assignee(techUser)
                .createdAt(now.minus(Duration.ofHours(10))) // SLA 4h -> breached!
                .build();

        when(incidentRepository.findAll(any(Specification.class))).thenReturn(List.of(inc1, inc2, inc3));

        DashboardMetricsResponse response = analyticsService.getDashboardMetrics(new AnalyticsFilterRequest(), "admin.super");

        assertThat(response.getTotalIncidents()).isEqualTo(3);
        assertThat(response.getOpenCount()).isEqualTo(1);
        assertThat(response.getResolvedCount()).isEqualTo(1);
        assertThat(response.getInProgressCount()).isEqualTo(1);
        assertThat(response.getCriticalCount()).isEqualTo(2);
        assertThat(response.getHighCount()).isEqualTo(1);
        assertThat(response.getCriticalAndHighCount()).isEqualTo(3);
        assertThat(response.getUnassignedCount()).isEqualTo(1);

        assertThat(response.getByCategory()).containsEntry("Software & OS", 2L);
        assertThat(response.getByCategory()).containsEntry("Network & VPN", 1L);

        SlaMetricsDto sla = response.getSlaMetrics();
        assertThat(sla.getTotalEvaluated()).isEqualTo(3);
        assertThat(sla.getOnTimeCount()).isEqualTo(2); // inc1 (active on-time) and inc2 (resolved on-time)
        assertThat(sla.getBreachedCount()).isEqualTo(1); // inc3 (active breached)
        assertThat(sla.getApproachingDeadlineCount()).isEqualTo(1); // inc1 has 1h remaining
        assertThat(sla.getComplianceRate()).isEqualTo(66.7); // (2 / 3) * 100 = 66.7%
        assertThat(sla.getAverageResolutionHours()).isEqualTo(4.0); // inc2 resolved in 4 hours
    }

    @Test
    @DisplayName("SLA Performance: Handled resolved, overdue, and reopened incidents correctly")
    void testSlaPerformanceCalculation() {
        Instant now = Instant.now();

        // Case A: Resolved after deadline -> Breached
        Incident resolvedBreached = Incident.builder()
                .id(10L).createdAt(now.minus(Duration.ofHours(10)))
                .resolvedAt(now.minus(Duration.ofHours(1))) // 9 hours to resolve, SLA is 4h -> breached
                .slaPolicy(criticalSla).build();

        // Case B: Reopened incident -> resolvedAt is null, createdAt was 6 hours ago for 4h SLA -> Breached
        Incident reopenedBreached = Incident.builder()
                .id(11L).createdAt(now.minus(Duration.ofHours(6)))
                .status(IncidentStatus.OPEN)
                .resolvedAt(null)
                .slaPolicy(criticalSla).build();

        // Case C: Active healthy -> createdAt was 30 mins ago for 8h SLA -> On-time, not approaching
        Incident activeHealthy = Incident.builder()
                .id(12L).createdAt(now.minus(Duration.ofMinutes(30)))
                .status(IncidentStatus.ASSIGNED)
                .slaPolicy(highSla).build();

        SlaMetricsDto metrics = analyticsService.calculateSlaMetrics(List.of(resolvedBreached, reopenedBreached, activeHealthy));

        assertThat(metrics.getTotalEvaluated()).isEqualTo(3);
        assertThat(metrics.getBreachedCount()).isEqualTo(2);
        assertThat(metrics.getOnTimeCount()).isEqualTo(1);
        assertThat(metrics.getApproachingDeadlineCount()).isEqualTo(0);
        assertThat(metrics.getComplianceRate()).isEqualTo(33.3);
    }

    @Test
    @DisplayName("SLA Performance: Empty incident list yields 100% compliance rate and 0 counts")
    void testEmptySlaMetrics() {
        SlaMetricsDto metrics = analyticsService.calculateSlaMetrics(Collections.emptyList());

        assertThat(metrics.getTotalEvaluated()).isZero();
        assertThat(metrics.getOnTimeCount()).isZero();
        assertThat(metrics.getBreachedCount()).isZero();
        assertThat(metrics.getComplianceRate()).isEqualTo(100.0);
        assertThat(metrics.getAverageResolutionHours()).isZero();
    }

    @Test
    @DisplayName("Technician Workload: Should aggregate active, resolved, and SLA metrics per technician")
    void testGetTechnicianWorkload() {
        when(userRepository.findByUsername("admin.super")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByRoleName(RoleName.ROLE_TECHNICIAN)).thenReturn(List.of(techUser));

        Instant now = Instant.now();
        Incident inc1 = Incident.builder()
                .id(1L).status(IncidentStatus.ASSIGNED)
                .slaPolicy(highSla).createdAt(now.minus(Duration.ofHours(1)))
                .assignee(techUser).build();
        Incident inc2 = Incident.builder()
                .id(2L).status(IncidentStatus.RESOLVED)
                .slaPolicy(highSla).createdAt(now.minus(Duration.ofHours(4))).resolvedAt(now.minus(Duration.ofHours(2)))
                .assignee(techUser).build();

        when(incidentRepository.findAll(any(Specification.class))).thenReturn(List.of(inc1, inc2));

        List<TechnicianWorkloadDto> workloads = analyticsService.getTechnicianWorkload(new AnalyticsFilterRequest(), "admin.super");

        assertThat(workloads).hasSize(1);
        TechnicianWorkloadDto techWorkload = workloads.get(0);
        assertThat(techWorkload.getUsername()).isEqualTo("tech.dave");
        assertThat(techWorkload.getFullName()).isEqualTo("Dave Technician");
        assertThat(techWorkload.getActiveAssignedCount()).isEqualTo(1);
        assertThat(techWorkload.getResolvedCount()).isEqualTo(1);
        assertThat(techWorkload.getTotalAssignedCount()).isEqualTo(2);
        assertThat(techWorkload.getSlaComplianceRate()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("Technician Workload: Employee role should be rejected with AccessDeniedException")
    void testEmployeeBlockedFromTechnicianWorkload() {
        when(userRepository.findByUsername("alice.emp")).thenReturn(Optional.of(employeeUser));

        assertThatThrownBy(() -> analyticsService.getTechnicianWorkload(new AnalyticsFilterRequest(), "alice.emp"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Employees are not authorized");
    }

    @Test
    @DisplayName("Trends Time Series: Should generate daily trend buckets")
    void testGetTrends() {
        when(userRepository.findByUsername("admin.super")).thenReturn(Optional.of(adminUser));

        Instant now = Instant.now();
        Incident inc1 = Incident.builder()
                .id(1L).createdAt(now.minus(Duration.ofDays(1)))
                .resolvedAt(now)
                .build();

        when(incidentRepository.findAll(any(Specification.class))).thenReturn(List.of(inc1));

        AnalyticsFilterRequest filter = AnalyticsFilterRequest.builder()
                .startDate(now.minus(Duration.ofDays(3)))
                .endDate(now)
                .build();

        List<TrendDataPointDto> trends = analyticsService.getTrends(filter, "admin.super");

        assertThat(trends).isNotEmpty();
        long totalCreated = trends.stream().mapToLong(TrendDataPointDto::getCreatedCount).sum();
        long totalResolved = trends.stream().mapToLong(TrendDataPointDto::getResolvedCount).sum();
        assertThat(totalCreated).isEqualTo(1);
        assertThat(totalResolved).isEqualTo(1);
    }

    @Test
    @DisplayName("CSV Export: Should generate valid RFC-4180 CSV with UTF-8 BOM, headers, and zero secret leakage")
    void testExportIncidentsCsv() {
        when(userRepository.findByUsername("admin.super")).thenReturn(Optional.of(adminUser));

        Instant now = Instant.now();
        Incident inc = Incident.builder()
                .id(1L)
                .ticketNumber("INC-20261018-TEST")
                .title("Database connection pool deadlock, critical")
                .category(softwareCategory)
                .priority(Priority.CRITICAL)
                .status(IncidentStatus.RESOLVED)
                .reporter(employeeUser)
                .assignee(techUser)
                .slaPolicy(criticalSla)
                .createdAt(now.minus(Duration.ofHours(3)))
                .resolvedAt(now.minus(Duration.ofHours(1)))
                .resolutionNotes("Cleared locked PID and rebooted replica")
                .build();

        when(incidentRepository.findAll(any(Specification.class))).thenReturn(List.of(inc));

        byte[] csvBytes = analyticsService.exportIncidentsCsv(new AnalyticsFilterRequest(), "admin.super");
        String csvContent = new String(csvBytes, StandardCharsets.UTF_8);

        assertThat(csvContent).startsWith("\ufeff"); // UTF-8 BOM
        assertThat(csvContent).contains("Ticket Number,Title,Category,Priority,Status");
        assertThat(csvContent).contains("INC-20261018-TEST");
        assertThat(csvContent).contains("\"Database connection pool deadlock, critical\""); // Escaped
        assertThat(csvContent).contains("Software & OS");
        assertThat(csvContent).contains("CRITICAL");
        assertThat(csvContent).contains("RESOLVED");
        assertThat(csvContent).contains("alice.emp");
        assertThat(csvContent).contains("tech.dave");
        assertThat(csvContent).contains("ON_TIME");
        assertThat(csvContent).contains("Cleared locked PID and rebooted replica");

        // Verify zero credentials or sensitive fields
        assertThat(csvContent).doesNotContain("password");
        assertThat(csvContent).doesNotContain("$2a$12$");
        assertThat(csvContent).doesNotContain("Bearer");
    }
}
