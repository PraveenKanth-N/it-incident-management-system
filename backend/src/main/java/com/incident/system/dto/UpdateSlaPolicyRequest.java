package com.incident.system.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSlaPolicyRequest {

    @NotNull(message = "Response time hours is required")
    @Min(value = 1, message = "Response time hours must be at least 1")
    @Max(value = 168, message = "Response time hours cannot exceed 168 (7 days)")
    private Integer responseTimeHours;

    @NotNull(message = "Resolution time hours is required")
    @Min(value = 1, message = "Resolution time hours must be at least 1")
    @Max(value = 720, message = "Resolution time hours cannot exceed 720 (30 days)")
    private Integer resolutionTimeHours;

    @Size(max = 255, message = "Description cannot exceed 255 characters")
    private String description;

    @Builder.Default
    private Boolean isActive = true;
}
