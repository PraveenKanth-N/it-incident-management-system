package com.incident.system.dto;

import com.incident.system.entity.IncidentStatus;
import com.incident.system.entity.IncidentStatusHistory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentStatusHistoryResponse {

    private Long id;
    private IncidentStatus oldStatus;
    private IncidentStatus newStatus;
    private UserSummaryDto changedBy;
    private String changeReason;
    private Instant createdAt;

    public static IncidentStatusHistoryResponse fromEntity(IncidentStatusHistory history) {
        if (history == null) {
            return null;
        }

        return IncidentStatusHistoryResponse.builder()
                .id(history.getId())
                .oldStatus(history.getOldStatus())
                .newStatus(history.getNewStatus())
                .changedBy(UserSummaryDto.fromEntity(history.getChangedBy()))
                .changeReason(history.getChangeReason())
                .createdAt(history.getCreatedAt())
                .build();
    }
}
