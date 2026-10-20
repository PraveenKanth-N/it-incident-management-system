package com.incident.system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EscalationScanResultDto {

    private Instant scanTimestamp;
    private int totalIncidentsEvaluated;
    private int warningsTriggered;
    private int breachesTriggered;
    private int criticalEscalationsTriggered;
    private int notificationsDispatched;
    private List<String> escalatedTickets;
}
