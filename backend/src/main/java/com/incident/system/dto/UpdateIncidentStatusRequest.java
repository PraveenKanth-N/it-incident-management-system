package com.incident.system.dto;

import com.incident.system.entity.IncidentStatus;
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
public class UpdateIncidentStatusRequest {

    @NotNull(message = "New status is required")
    private IncidentStatus status;

    @Size(max = 255, message = "Reason cannot exceed 255 characters")
    private String reason;

    private String resolutionNotes;
}
