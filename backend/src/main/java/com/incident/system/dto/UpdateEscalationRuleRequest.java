package com.incident.system.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEscalationRuleRequest {

    @Min(value = 10, message = "Warning threshold must be at least 10%")
    @Max(value = 99, message = "Warning threshold must be at most 99%")
    private Integer warningThresholdPercent;

    @Min(value = 1, message = "Breach level must be at least 1")
    @Max(value = 5, message = "Breach level must be at most 5")
    private Integer breachLevel;

    @Min(value = 101, message = "Critical threshold must be greater than 100%")
    @Max(value = 500, message = "Critical threshold must be at most 500%")
    private Integer criticalThresholdPercent;

    private Boolean autoEscalateUnassigned;
    private Boolean isActive;
}
