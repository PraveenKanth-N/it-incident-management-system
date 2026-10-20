package com.incident.system.dto;

import com.incident.system.entity.AuditEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditEventResponse {

    private Long id;
    private String entityType;
    private Long entityId;
    private String action;
    private UserSummaryDto performedBy;
    private String previousState;
    private String newState;
    private String ipAddress;
    private Instant createdAt;

    public static AuditEventResponse fromEntity(AuditEvent event) {
        if (event == null) {
            return null;
        }

        return AuditEventResponse.builder()
                .id(event.getId())
                .entityType(event.getEntityType())
                .entityId(event.getEntityId())
                .action(event.getAction())
                .performedBy(event.getPerformedBy() != null ? UserSummaryDto.fromEntity(event.getPerformedBy()) : null)
                .previousState(event.getPreviousState())
                .newState(event.getNewState())
                .ipAddress(event.getIpAddress())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
