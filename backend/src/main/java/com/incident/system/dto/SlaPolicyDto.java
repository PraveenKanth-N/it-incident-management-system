package com.incident.system.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.incident.system.entity.Priority;
import com.incident.system.entity.SlaPolicy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlaPolicyDto {
    private Long id;
    private String name;
    private Priority priority;
    private Integer responseTimeHours;
    private Integer resolutionTimeHours;
    private String description;
    
    @JsonProperty("isActive")
    private boolean isActive;

    public static SlaPolicyDto fromEntity(SlaPolicy policy) {
        if (policy == null) {
            return null;
        }
        return SlaPolicyDto.builder()
                .id(policy.getId())
                .name(policy.getName())
                .priority(policy.getPriority())
                .responseTimeHours(policy.getResponseTimeHours())
                .resolutionTimeHours(policy.getResolutionTimeHours())
                .description(policy.getDescription())
                .isActive(policy.isActive())
                .build();
    }
}
