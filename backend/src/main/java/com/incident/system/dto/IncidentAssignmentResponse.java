package com.incident.system.dto;

import com.incident.system.entity.IncidentAssignment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentAssignmentResponse {

    private Long id;
    private UserSummaryDto assignedBy;
    private UserSummaryDto previousAssignee;
    private UserSummaryDto assignedTo;
    private String assignmentNotes;
    private Instant assignedAt;

    public static IncidentAssignmentResponse fromEntity(IncidentAssignment assignment) {
        if (assignment == null) {
            return null;
        }

        return IncidentAssignmentResponse.builder()
                .id(assignment.getId())
                .assignedBy(UserSummaryDto.fromEntity(assignment.getAssignedBy()))
                .previousAssignee(assignment.getPreviousAssignee() != null ? UserSummaryDto.fromEntity(assignment.getPreviousAssignee()) : null)
                .assignedTo(UserSummaryDto.fromEntity(assignment.getAssignedTo()))
                .assignmentNotes(assignment.getAssignmentNotes())
                .assignedAt(assignment.getAssignedAt())
                .build();
    }
}
