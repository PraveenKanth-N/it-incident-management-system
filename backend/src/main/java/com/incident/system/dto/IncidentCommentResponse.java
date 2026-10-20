package com.incident.system.dto;

import com.incident.system.entity.IncidentComment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentCommentResponse {

    private Long id;
    private Long incidentId;
    private UserSummaryDto author;
    private String commentText;
    private boolean isInternal;
    private Instant createdAt;

    public static IncidentCommentResponse fromEntity(IncidentComment comment) {
        if (comment == null) {
            return null;
        }

        return IncidentCommentResponse.builder()
                .id(comment.getId())
                .incidentId(comment.getIncident().getId())
                .author(UserSummaryDto.fromEntity(comment.getAuthor()))
                .commentText(comment.getCommentText())
                .isInternal(comment.isInternal())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
