package com.incident.system.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TechnicianWorkloadDto {
    private Long technicianId;
    private String username;
    private String fullName;
    private String department;
    private long activeAssignedCount; // ASSIGNED, IN_PROGRESS
    private long resolvedCount;       // RESOLVED, CLOSED
    private long totalAssignedCount;
    private long breachedCount;
    private double slaComplianceRate;
    private double avgResolutionHours;
}
