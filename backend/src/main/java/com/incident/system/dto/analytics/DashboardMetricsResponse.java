package com.incident.system.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetricsResponse {
    private long totalIncidents;
    private long openCount;
    private long triagedCount;
    private long assignedCount;
    private long inProgressCount;
    private long resolvedCount;
    private long closedCount;

    private long criticalCount;
    private long highCount;
    private long mediumCount;
    private long lowCount;

    private long criticalAndHighCount;
    private long unassignedCount;

    private Map<String, Long> byStatus;
    private Map<String, Long> byPriority;
    private Map<String, Long> byCategory;

    private SlaMetricsDto slaMetrics;

    private Instant periodStart;
    private Instant periodEnd;
}
