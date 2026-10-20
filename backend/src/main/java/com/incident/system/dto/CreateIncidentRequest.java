package com.incident.system.dto;

import com.incident.system.entity.Impact;
import com.incident.system.entity.Priority;
import com.incident.system.entity.Urgency;
import jakarta.validation.constraints.NotBlank;
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
public class CreateIncidentRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 3, max = 200, message = "Title must be between 3 and 200 characters")
    private String title;

    @NotBlank(message = "Description is required")
    @Size(max = 10000, message = "Description cannot exceed 10000 characters")
    private String description;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @NotNull(message = "Impact is required")
    private Impact impact;

    @NotNull(message = "Urgency is required")
    private Urgency urgency;

    // Optional: client may supply priority, but it will be validated against the impact-urgency matrix
    private Priority priority;
}
