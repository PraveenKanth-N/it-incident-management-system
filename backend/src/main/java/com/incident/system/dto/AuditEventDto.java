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
public class AuditEventDto {
    private Long id;
    private String entityType;
    private Long entityId;
    private String action;
    private String performedByUsername;
    private String performedByFullName;
    private String performedByRole;
    private String previousState;
    private String newState;
    private String ipAddress;
    private String outcome;
    private Instant createdAt;

    public static AuditEventDto fromEntity(AuditEvent event) {
        if (event == null) {
            return null;
        }

        String username = "SYSTEM";
        String fullName = "System Automated Process";
        String role = "SYSTEM";

        if (event.getPerformedBy() != null) {
            username = event.getPerformedBy().getUsername();
            fullName = event.getPerformedBy().getFullName();
            role = event.getPerformedBy().getRole() != null ? 
                    event.getPerformedBy().getRole().getName().name() : "USER";
        }

        // Determine clear outcome based on action semantics
        String outcome = "SUCCESS";
        if (event.getAction() != null) {
            String actUpper = event.getAction().toUpperCase();
            if (actUpper.contains("FAIL") || actUpper.contains("ERROR") || actUpper.contains("REJECT")) {
                outcome = "FAILURE";
            } else if (actUpper.contains("WARNING") || actUpper.contains("BREACH")) {
                outcome = "FLAGGED";
            }
        }

        return AuditEventDto.builder()
                .id(event.getId())
                .entityType(event.getEntityType())
                .entityId(event.getEntityId())
                .action(event.getAction())
                .performedByUsername(username)
                .performedByFullName(fullName)
                .performedByRole(role)
                .previousState(sanitizeState(event.getPreviousState()))
                .newState(sanitizeState(event.getNewState()))
                .ipAddress(event.getIpAddress() != null ? event.getIpAddress() : "internal")
                .outcome(outcome)
                .createdAt(event.getCreatedAt())
                .build();
    }

    private static String sanitizeState(String state) {
        if (state == null) {
            return null;
        }
        // Security Hardening: Mask passwords, hashes, tokens, secrets, API keys, and authorization headers
        String sanitized = state.replaceAll("(?i)(\"(password|passwordHash|token|secret|apiKey|authorization|credentials)[^\"]*\":\\s*\")[^\"]+(\")", "$1[PROTECTED]$3");
        // Also mask raw BCrypt password hashes if present anywhere in the state text
        return sanitized.replaceAll("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}", "[PROTECTED_HASH]");
    }
}
