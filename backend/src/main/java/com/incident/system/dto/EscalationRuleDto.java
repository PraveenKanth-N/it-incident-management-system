package com.incident.system.dto;

import com.incident.system.entity.EscalationRule;
import com.incident.system.entity.Priority;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EscalationRuleDto {

    private Long id;
    private Priority priority;
    private int warningThresholdPercent;
    private int breachLevel;
    private int criticalThresholdPercent;
    private boolean autoEscalateUnassigned;
    private boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;

    public static EscalationRuleDto fromEntity(EscalationRule rule) {
        if (rule == null) {
            return null;
        }

        return EscalationRuleDto.builder()
                .id(rule.getId())
                .priority(rule.getPriority())
                .warningThresholdPercent(rule.getWarningThresholdPercent())
                .breachLevel(rule.getBreachLevel())
                .criticalThresholdPercent(rule.getCriticalThresholdPercent())
                .autoEscalateUnassigned(rule.isAutoEscalateUnassigned())
                .isActive(rule.isActive())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }
}
