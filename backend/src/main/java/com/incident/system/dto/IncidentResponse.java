package com.incident.system.dto;

import com.incident.system.entity.Impact;
import com.incident.system.entity.Incident;
import com.incident.system.entity.IncidentStatus;
import com.incident.system.entity.Priority;
import com.incident.system.entity.Urgency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentResponse {

    private Long id;
    private String ticketNumber;
    private String title;
    private String description;
    private Impact impact;
    private Urgency urgency;
    private Priority priority;
    private IncidentStatus status;
    private CategoryDto category;
    private UserSummaryDto reporter;
    private UserSummaryDto assignee;
    private SlaPolicyDto slaPolicy;
    private String resolutionNotes;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant resolvedAt;
    private int escalationLevel;
    private boolean slaBreached;

    public static IncidentResponse fromEntity(Incident incident) {
        if (incident == null) {
            return null;
        }

        return IncidentResponse.builder()
                .id(incident.getId())
                .ticketNumber(incident.getTicketNumber())
                .title(incident.getTitle())
                .description(incident.getDescription())
                .impact(incident.getImpact())
                .urgency(incident.getUrgency())
                .priority(incident.getPriority())
                .status(incident.getStatus())
                .category(CategoryDto.fromEntity(incident.getCategory()))
                .reporter(UserSummaryDto.fromEntity(incident.getReporter()))
                .assignee(incident.getAssignee() != null ? UserSummaryDto.fromEntity(incident.getAssignee()) : null)
                .slaPolicy(incident.getSlaPolicy() != null ? SlaPolicyDto.fromEntity(incident.getSlaPolicy()) : null)
                .resolutionNotes(incident.getResolutionNotes())
                .createdAt(incident.getCreatedAt())
                .updatedAt(incident.getUpdatedAt())
                .resolvedAt(incident.getResolvedAt())
                .escalationLevel(incident.getEscalationLevel())
                .slaBreached(incident.isSlaBreached())
                .build();
    }
}
