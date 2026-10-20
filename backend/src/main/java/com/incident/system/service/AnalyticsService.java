package com.incident.system.service;

import com.incident.system.dto.analytics.*;
import com.incident.system.entity.*;
import com.incident.system.exception.ResourceNotFoundException;
import com.incident.system.repository.IncidentCategoryRepository;
import com.incident.system.repository.IncidentRepository;
import com.incident.system.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final IncidentCategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public DashboardMetricsResponse getDashboardMetrics(AnalyticsFilterRequest filter, String currentUsername) {
        User currentUser = getAuthenticatedUser(currentUsername);
        Specification<Incident> spec = buildSpecification(filter, currentUser);
        List<Incident> incidents = incidentRepository.findAll(spec);

        long totalIncidents = incidents.size();

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (IncidentStatus s : IncidentStatus.values()) {
            byStatus.put(s.name(), 0L);
        }
        for (Incident inc : incidents) {
            byStatus.put(inc.getStatus().name(), byStatus.get(inc.getStatus().name()) + 1);
        }

        Map<String, Long> byPriority = new LinkedHashMap<>();
        for (Priority p : Priority.values()) {
            byPriority.put(p.name(), 0L);
        }
        for (Incident inc : incidents) {
            byPriority.put(inc.getPriority().name(), byPriority.get(inc.getPriority().name()) + 1);
        }

        Map<String, Long> byCategory = new LinkedHashMap<>();
        List<IncidentCategory> allCategories = categoryRepository.findAll();
        for (IncidentCategory cat : allCategories) {
            byCategory.put(cat.getName(), 0L);
        }
        for (Incident inc : incidents) {
            String catName = inc.getCategory() != null ? inc.getCategory().getName() : "Uncategorized";
            byCategory.put(catName, byCategory.getOrDefault(catName, 0L) + 1);
        }

        long openCount = byStatus.getOrDefault(IncidentStatus.OPEN.name(), 0L);
        long triagedCount = byStatus.getOrDefault(IncidentStatus.TRIAGED.name(), 0L);
        long assignedCount = byStatus.getOrDefault(IncidentStatus.ASSIGNED.name(), 0L);
        long inProgressCount = byStatus.getOrDefault(IncidentStatus.IN_PROGRESS.name(), 0L);
        long resolvedCount = byStatus.getOrDefault(IncidentStatus.RESOLVED.name(), 0L);
        long closedCount = byStatus.getOrDefault(IncidentStatus.CLOSED.name(), 0L);

        long criticalCount = byPriority.getOrDefault(Priority.CRITICAL.name(), 0L);
        long highCount = byPriority.getOrDefault(Priority.HIGH.name(), 0L);
        long mediumCount = byPriority.getOrDefault(Priority.MEDIUM.name(), 0L);
        long lowCount = byPriority.getOrDefault(Priority.LOW.name(), 0L);

        long criticalAndHigh = criticalCount + highCount;
        long unassignedCount = incidents.stream()
                .filter(i -> i.getAssignee() == null && i.getStatus() != IncidentStatus.RESOLVED && i.getStatus() != IncidentStatus.CLOSED)
                .count();

        SlaMetricsDto slaMetrics = calculateSlaMetrics(incidents);

        return DashboardMetricsResponse.builder()
                .totalIncidents(totalIncidents)
                .openCount(openCount)
                .triagedCount(triagedCount)
                .assignedCount(assignedCount)
                .inProgressCount(inProgressCount)
                .resolvedCount(resolvedCount)
                .closedCount(closedCount)
                .criticalCount(criticalCount)
                .highCount(highCount)
                .mediumCount(mediumCount)
                .lowCount(lowCount)
                .criticalAndHighCount(criticalAndHigh)
                .unassignedCount(unassignedCount)
                .byStatus(byStatus)
                .byPriority(byPriority)
                .byCategory(byCategory)
                .slaMetrics(slaMetrics)
                .periodStart(filter != null ? filter.getStartDate() : null)
                .periodEnd(filter != null ? filter.getEndDate() : null)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TrendDataPointDto> getTrends(AnalyticsFilterRequest filter, String currentUsername) {
        User currentUser = getAuthenticatedUser(currentUsername);
        Specification<Incident> spec = buildSpecification(filter, currentUser);
        List<Incident> incidents = incidentRepository.findAll(spec);

        // Determine date range for time series (default to last 14 days if not supplied)
        LocalDate endLocalDate = filter != null && filter.getEndDate() != null
                ? filter.getEndDate().atZone(ZoneOffset.UTC).toLocalDate()
                : LocalDate.now(ZoneOffset.UTC);
        LocalDate startLocalDate = filter != null && filter.getStartDate() != null
                ? filter.getStartDate().atZone(ZoneOffset.UTC).toLocalDate()
                : endLocalDate.minusDays(13);

        if (startLocalDate.isAfter(endLocalDate)) {
            startLocalDate = endLocalDate.minusDays(13);
        }

        // Initialize zero-filled map for every day in the range
        Map<String, long[]> dailyCounts = new LinkedHashMap<>(); // [created, resolved]
        LocalDate current = startLocalDate;
        while (!current.isAfter(endLocalDate)) {
            dailyCounts.put(current.toString(), new long[]{0, 0});
            current = current.plusDays(1);
        }

        for (Incident inc : incidents) {
            String createdDate = inc.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate().toString();
            if (dailyCounts.containsKey(createdDate)) {
                dailyCounts.get(createdDate)[0]++;
            }
            if (inc.getResolvedAt() != null) {
                String resolvedDate = inc.getResolvedAt().atZone(ZoneOffset.UTC).toLocalDate().toString();
                if (dailyCounts.containsKey(resolvedDate)) {
                    dailyCounts.get(resolvedDate)[1]++;
                }
            }
        }

        return dailyCounts.entrySet().stream()
                .map(e -> TrendDataPointDto.builder()
                        .date(e.getKey())
                        .createdCount(e.getValue()[0])
                        .resolvedCount(e.getValue()[1])
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TechnicianWorkloadDto> getTechnicianWorkload(AnalyticsFilterRequest filter, String currentUsername) {
        User currentUser = getAuthenticatedUser(currentUsername);
        if (currentUser.getRole().getName() == RoleName.ROLE_EMPLOYEE) {
            throw new AccessDeniedException("Employees are not authorized to view technician workload distributions.");
        }

        List<User> technicians = userRepository.findByRoleName(RoleName.ROLE_TECHNICIAN);
        List<Incident> allIncidents = incidentRepository.findAll(buildSpecification(filter, currentUser));

        // Group incidents by assignee ID
        Map<Long, List<Incident>> byAssignee = allIncidents.stream()
                .filter(i -> i.getAssignee() != null)
                .collect(Collectors.groupingBy(i -> i.getAssignee().getId()));

        List<TechnicianWorkloadDto> results = new ArrayList<>();
        for (User tech : technicians) {
            List<Incident> techIncidents = byAssignee.getOrDefault(tech.getId(), Collections.emptyList());

            long activeCount = techIncidents.stream()
                    .filter(i -> i.getStatus() == IncidentStatus.ASSIGNED || i.getStatus() == IncidentStatus.IN_PROGRESS)
                    .count();

            long resolvedCount = techIncidents.stream()
                    .filter(i -> i.getStatus() == IncidentStatus.RESOLVED || i.getStatus() == IncidentStatus.CLOSED)
                    .count();

            SlaMetricsDto sla = calculateSlaMetrics(techIncidents);

            results.add(TechnicianWorkloadDto.builder()
                    .technicianId(tech.getId())
                    .username(tech.getUsername())
                    .fullName(tech.getFullName() != null ? tech.getFullName() : tech.getUsername())
                    .department(tech.getDepartment() != null ? tech.getDepartment() : "NOC Operations")
                    .activeAssignedCount(activeCount)
                    .resolvedCount(resolvedCount)
                    .totalAssignedCount(techIncidents.size())
                    .breachedCount(sla.getBreachedCount())
                    .slaComplianceRate(sla.getComplianceRate())
                    .avgResolutionHours(sla.getAverageResolutionHours())
                    .build());
        }

        // Sort by active workload descending
        results.sort(Comparator.comparingLong(TechnicianWorkloadDto::getActiveAssignedCount).reversed());
        return results;
    }

    @Transactional(readOnly = true)
    public byte[] exportIncidentsCsv(AnalyticsFilterRequest filter, String currentUsername) {
        User currentUser = getAuthenticatedUser(currentUsername);
        Specification<Incident> spec = buildSpecification(filter, currentUser);
        List<Incident> incidents = incidentRepository.findAll(spec);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC);

        StringBuilder sb = new StringBuilder();
        // UTF-8 BOM for Microsoft Excel compatibility
        sb.append('\ufeff');
        sb.append("Ticket Number,Title,Category,Priority,Status,Reporter,Assignee,Created At (UTC),Resolved At (UTC),Resolution Time (Hours),SLA Policy,SLA Target (Hours),SLA Status,Resolution Notes\n");

        for (Incident inc : incidents) {
            int slaHours = getSlaHours(inc);
            Instant deadline = inc.getCreatedAt().plus(Duration.ofHours(slaHours));

            String slaStatus;
            Double resolutionTimeHours = null;

            if (inc.getResolvedAt() != null) {
                long minutes = Duration.between(inc.getCreatedAt(), inc.getResolvedAt()).toMinutes();
                resolutionTimeHours = Math.round((minutes / 60.0) * 10.0) / 10.0;
                slaStatus = inc.getResolvedAt().isAfter(deadline) ? "BREACHED" : "ON_TIME";
            } else {
                Instant now = Instant.now();
                if (now.isAfter(deadline)) {
                    slaStatus = "BREACHED";
                } else {
                    long remainingMin = Duration.between(now, deadline).toMinutes();
                    slaStatus = (remainingMin <= 120 || remainingMin <= (slaHours * 60L) / 4)
                            ? "APPROACHING_DEADLINE"
                            : "ON_TIME";
                }
            }

            sb.append(escapeCsv(inc.getTicketNumber())).append(",");
            sb.append(escapeCsv(inc.getTitle())).append(",");
            sb.append(escapeCsv(inc.getCategory() != null ? inc.getCategory().getName() : "Unassigned")).append(",");
            sb.append(escapeCsv(inc.getPriority().name())).append(",");
            sb.append(escapeCsv(inc.getStatus().name())).append(",");
            sb.append(escapeCsv(inc.getReporter() != null ? inc.getReporter().getUsername() : "")).append(",");
            sb.append(escapeCsv(inc.getAssignee() != null ? inc.getAssignee().getUsername() : "Unassigned")).append(",");
            sb.append(escapeCsv(dtf.format(inc.getCreatedAt()))).append(",");
            sb.append(escapeCsv(inc.getResolvedAt() != null ? dtf.format(inc.getResolvedAt()) : "")).append(",");
            sb.append(resolutionTimeHours != null ? resolutionTimeHours : "").append(",");
            sb.append(escapeCsv(inc.getSlaPolicy() != null ? inc.getSlaPolicy().getName() : "Default")).append(",");
            sb.append(slaHours).append(",");
            sb.append(escapeCsv(slaStatus)).append(",");
            sb.append(escapeCsv(inc.getResolutionNotes() != null ? inc.getResolutionNotes() : "")).append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    public SlaMetricsDto calculateSlaMetrics(List<Incident> incidents) {
        if (incidents == null || incidents.isEmpty()) {
            return SlaMetricsDto.builder()
                    .totalEvaluated(0)
                    .onTimeCount(0)
                    .breachedCount(0)
                    .approachingDeadlineCount(0)
                    .complianceRate(100.0)
                    .averageResolutionHours(0.0)
                    .build();
        }

        long totalEvaluated = incidents.size();
        long onTimeCount = 0;
        long breachedCount = 0;
        long approachingDeadlineCount = 0;
        double totalResolutionHours = 0.0;
        long resolvedCount = 0;

        Instant now = Instant.now();

        for (Incident inc : incidents) {
            int slaHours = getSlaHours(inc);
            Instant deadline = inc.getCreatedAt().plus(Duration.ofHours(slaHours));

            if (inc.getResolvedAt() != null) {
                // Resolved / Closed incident
                long minutes = Duration.between(inc.getCreatedAt(), inc.getResolvedAt()).toMinutes();
                double hours = Math.max(0.0, minutes / 60.0);
                totalResolutionHours += hours;
                resolvedCount++;

                if (inc.getResolvedAt().isAfter(deadline)) {
                    breachedCount++;
                } else {
                    onTimeCount++;
                }
            } else {
                // Active or reopened incident
                if (now.isAfter(deadline)) {
                    breachedCount++;
                } else {
                    onTimeCount++;
                    long remainingMin = Duration.between(now, deadline).toMinutes();
                    if (remainingMin <= 120 || remainingMin <= (slaHours * 60L) / 4) {
                        approachingDeadlineCount++;
                    }
                }
            }
        }

        double complianceRate = totalEvaluated > 0
                ? Math.round(((double) onTimeCount / totalEvaluated) * 1000.0) / 10.0
                : 100.0;

        double avgResolutionHours = resolvedCount > 0
                ? Math.round((totalResolutionHours / resolvedCount) * 10.0) / 10.0
                : 0.0;

        return SlaMetricsDto.builder()
                .totalEvaluated(totalEvaluated)
                .onTimeCount(onTimeCount)
                .breachedCount(breachedCount)
                .approachingDeadlineCount(approachingDeadlineCount)
                .complianceRate(complianceRate)
                .averageResolutionHours(avgResolutionHours)
                .build();
    }

    private int getSlaHours(Incident inc) {
        if (inc.getSlaPolicy() != null && inc.getSlaPolicy().getResolutionTimeHours() > 0) {
            return inc.getSlaPolicy().getResolutionTimeHours();
        }
        if (inc.getCategory() != null && inc.getCategory().getSlaHours() > 0) {
            return inc.getCategory().getSlaHours();
        }
        return 24; // Default fallback SLA
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        String sanitized = value;
        // Security Hardening: Prevent CSV Formula Injection (CWE-1236 / DDE Injection)
        // If the cell begins with formula trigger characters (=, +, -, @, \t, \r), prepend a single quote
        if (sanitized.startsWith("=") || sanitized.startsWith("+") || sanitized.startsWith("-")
                || sanitized.startsWith("@") || sanitized.startsWith("\t") || sanitized.startsWith("\r")) {
            sanitized = "'" + sanitized;
        }
        if (sanitized.contains(",") || sanitized.contains("\"") || sanitized.contains("\n") || sanitized.contains("\r")) {
            return "\"" + sanitized.replace("\"", "\"\"") + "\"";
        }
        return sanitized;
    }

    private Specification<Incident> buildSpecification(AnalyticsFilterRequest filter, User currentUser) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Object-level isolation: employees can ONLY see metrics for their own reported tickets
            if (currentUser.getRole().getName() == RoleName.ROLE_EMPLOYEE) {
                predicates.add(cb.equal(root.get("reporter").get("id"), currentUser.getId()));
            } else if (filter != null && filter.getReporterId() != null) {
                predicates.add(cb.equal(root.get("reporter").get("id"), filter.getReporterId()));
            }

            if (filter != null) {
                if (filter.getStartDate() != null) {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.getStartDate()));
                }
                if (filter.getEndDate() != null) {
                    predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), filter.getEndDate()));
                }
                if (filter.getStatus() != null) {
                    predicates.add(cb.equal(root.get("status"), filter.getStatus()));
                }
                if (filter.getPriority() != null) {
                    predicates.add(cb.equal(root.get("priority"), filter.getPriority()));
                }
                if (filter.getCategoryId() != null) {
                    predicates.add(cb.equal(root.get("category").get("id"), filter.getCategoryId()));
                }
                if (filter.getAssigneeId() != null) {
                    if (filter.getAssigneeId() == -1L) {
                        predicates.add(cb.isNull(root.get("assignee")));
                    } else {
                        predicates.add(cb.equal(root.get("assignee").get("id"), filter.getAssigneeId()));
                    }
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private User getAuthenticatedUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found: " + username));
    }
}
