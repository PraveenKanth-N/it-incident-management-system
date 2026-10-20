package com.incident.system.dto;

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
public class AssignIncidentRequest {

    @NotNull(message = "Assignee ID is required")
    private Long assigneeId;

    @Size(max = 255, message = "Assignment notes cannot exceed 255 characters")
    private String notes;
}
