package com.incident.system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentHistoryResponse {

    private Long incidentId;
    private String ticketNumber;
    private List<IncidentStatusHistoryResponse> statusHistory;
    private List<IncidentAssignmentResponse> assignmentHistory;
    private List<AuditEventResponse> auditEvents;
}
