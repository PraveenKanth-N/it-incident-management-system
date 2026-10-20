package com.incident.system.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlaMetricsDto {
    private long totalEvaluated;
    private long onTimeCount;
    private long breachedCount;
    private long approachingDeadlineCount;
    private double complianceRate;
    private double averageResolutionHours;
}
