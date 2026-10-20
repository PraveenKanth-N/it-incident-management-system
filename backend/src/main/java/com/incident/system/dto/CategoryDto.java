package com.incident.system.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.incident.system.entity.IncidentCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryDto {
    private Long id;
    private String name;
    private String description;
    private Integer slaHours;
    
    @JsonProperty("isActive")
    private boolean isActive;

    public static CategoryDto fromEntity(IncidentCategory category) {
        if (category == null) {
            return null;
        }
        return CategoryDto.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .slaHours(category.getSlaHours())
                .isActive(category.isActive())
                .build();
    }
}
