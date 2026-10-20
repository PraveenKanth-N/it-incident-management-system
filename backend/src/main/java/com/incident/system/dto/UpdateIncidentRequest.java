package com.incident.system.dto;

import com.incident.system.entity.Impact;
import com.incident.system.entity.Priority;
import com.incident.system.entity.Urgency;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateIncidentRequest {

    @Size(min = 3, max = 200, message = "Title must be between 3 and 200 characters")
    private String title;

    @Size(max = 10000, message = "Description cannot exceed 10000 characters")
    private String description;

    private Long categoryId;

    private Impact impact;

    private Urgency urgency;

    private Priority priority;
}
