package com.incident.system.service;

import com.incident.system.dto.EscalationRuleDto;
import com.incident.system.dto.EscalationScanResultDto;
import com.incident.system.dto.UpdateEscalationRuleRequest;
import com.incident.system.entity.*;
import com.incident.system.exception.ResourceNotFoundException;
import com.incident.system.repository.EscalationRuleRepository;
import com.incident.system.repository.IncidentRepository;
import com.incident.system.repository.SlaPolicyRepository;
import com.incident.system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SlaEscalationService {

    private final IncidentRepository incidentRepository;
    private final SlaPolicyRepository slaPolicyRepository;
    private final EscalationRuleRepository escalationRuleRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private static final List<IncidentStatus> RESOLVED_OR_CLOSED = List.of(
            IncidentStatus.RESOLVED,
            IncidentStatus.CLOSED
    );

    private final java.util.concurrent.locks.ReentrantLock scanLock = new java.util.concurrent.locks.ReentrantLock();

    /**
     * Periodic scheduled escalation scan (runs every 60 seconds by default).
     */
    @Scheduled(fixedRateString = "${app.automation.escalation-interval-ms:60000}")
    @Transactional
    public void scheduledEscalationScan() {
        try {
            log.debug("Starting periodic SLA escalation scanner...");
            runEscalationScan();
        } catch (Exception ex) {
            log.error("Error occurred during scheduled SLA escalation scan: {}", ex.getMessage(), ex);
        }
    }

    /**
     * Executes an SLA escalation scan across all active incidents.
     * Idempotent and thread-safe: repeated runs produce no duplicate escalations, audit events, or notifications.
     */
    @Transactional
    public EscalationScanResultDto runEscalationScan() {
        scanLock.lock();
        try {
            Instant now = Instant.now();
            List<Incident> activeIncidents = incidentRepository.findActiveIncidentsForEscalation(RESOLVED_OR_CLOSED);

        int warnings = 0;
        int breaches = 0;
        int criticals = 0;
        int notifsDispatched = 0;
        List<String> escalatedTickets = new ArrayList<>();

        Map<Priority, EscalationRule> ruleCache = new HashMap<>();

        for (Incident incident : activeIncidents) {
            int slaHours = resolveSlaHours(incident);
            Instant deadline = incident.getCreatedAt().plus(Duration.ofHours(slaHours));

            long elapsedMinutes = Math.max(0, Duration.between(incident.getCreatedAt(), now).toMinutes());
            long totalSlaMinutes = Math.max(1, slaHours * 60L);
            long remainingMinutes = totalSlaMinutes - elapsedMinutes;
            long percentageElapsed = (elapsedMinutes * 100) / totalSlaMinutes;

            EscalationRule rule = ruleCache.computeIfAbsent(
                    incident.getPriority(),
                    p -> escalationRuleRepository.findByPriority(p).orElseGet(() -> buildDefaultRule(p))
            );

            if (!rule.isActive()) {
                continue;
            }

            int currentLevel = incident.getEscalationLevel();
            boolean modified = false;

            // --- LEVEL 3: CRITICAL/PROLONGED BREACH ---
            if (percentageElapsed >= rule.getCriticalThresholdPercent() ||
                    (incident.isSlaBreached() && incident.getPriority() == Priority.CRITICAL && remainingMinutes <= -120)) {

                if (currentLevel < 3) {
                    incident.setEscalationLevel(3);
                    incident.setEscalatedAt(now);
                    incident.setSlaBreached(true);
                    modified = true;
                    criticals++;
                    escalatedTickets.add(incident.getTicketNumber() + " (Level 3 - Critical)");

                    auditService.logEvent(
                            "INCIDENT",
                            incident.getId(),
                            "SLA_CRITICAL_ESCALATION",
                            null,
                            "Level " + currentLevel,
                            String.format("Level 3 Escalation: %d%% of SLA elapsed (%d min overdue)",
                                    percentageElapsed, Math.abs(remainingMinutes))
                    );

                    notificationService.notifyIncidentEscalated(
                            incident,
                            3,
                            String.format("Prolonged SLA breach (%d%% elapsed). Assigned: %s",
                                    percentageElapsed,
                                    incident.getAssignee() != null ? incident.getAssignee().getUsername() : "UNASSIGNED")
                    );
                    notifsDispatched++;
                }
            }
            // --- LEVEL 2: BREACH ESCALATION ---
            else if (now.isAfter(deadline) || percentageElapsed >= 100) {
                if (currentLevel < 2) {
                    incident.setEscalationLevel(2);
                    incident.setEscalatedAt(now);
                    incident.setSlaBreached(true);
                    modified = true;
                    breaches++;
                    escalatedTickets.add(incident.getTicketNumber() + " (Level 2 - Breached)");

                    auditService.logEvent(
                            "INCIDENT",
                            incident.getId(),
                            "SLA_BREACH_ESCALATED",
                            null,
                            "Level " + currentLevel,
                            String.format("Level 2 Escalation: Target %dh deadline exceeded", slaHours)
                    );

                    notificationService.notifySlaBreached(incident);
                    notifsDispatched++;
                }
            }
            // --- LEVEL 1: APPROACHING DEADLINE WARNING ---
            else if (percentageElapsed >= rule.getWarningThresholdPercent() || remainingMinutes <= 120) {
                if (currentLevel < 1) {
                    incident.setEscalationLevel(1);
                    incident.setEscalatedAt(now);
                    modified = true;
                    warnings++;
                    escalatedTickets.add(incident.getTicketNumber() + " (Level 1 - Warning)");

                    String unassignedNote = (incident.getAssignee() == null && rule.isAutoEscalateUnassigned())
                            ? " [UNASSIGNED PRIORITY ALERT]"
                            : "";

                    auditService.logEvent(
                            "INCIDENT",
                            incident.getId(),
                            "SLA_WARNING_ESCALATED",
                            null,
                            "Level 0",
                            String.format("Level 1 Warning: %d%% elapsed (%d min remaining)%s",
                                    percentageElapsed, remainingMinutes, unassignedNote)
                    );

                    notificationService.notifySlaWarning(incident, (int) percentageElapsed, remainingMinutes);
                    notifsDispatched++;
                }
            }

            if (modified) {
                incidentRepository.save(incident);
            }
        }

        log.info("SLA scan complete: evaluated={}, warnings={}, breaches={}, critical={}, notifs={}",
                activeIncidents.size(), warnings, breaches, criticals, notifsDispatched);

        return EscalationScanResultDto.builder()
                .scanTimestamp(now)
                .totalIncidentsEvaluated(activeIncidents.size())
                .warningsTriggered(warnings)
                .breachesTriggered(breaches)
                .criticalEscalationsTriggered(criticals)
                .notificationsDispatched(notifsDispatched)
                .escalatedTickets(escalatedTickets)
                .build();
        } finally {
            scanLock.unlock();
        }
    }

    @Transactional(readOnly = true)
    public List<EscalationRuleDto> getEscalationRules() {
        return escalationRuleRepository.findAll().stream()
                .map(EscalationRuleDto::fromEntity)
                .sorted(Comparator.comparing(r -> r.getPriority().ordinal()))
                .toList();
    }

    @Transactional
    public EscalationRuleDto updateEscalationRule(Priority priority, UpdateEscalationRuleRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        if (user.getRole().getName() != RoleName.ROLE_ADMIN) {
            throw new AccessDeniedException("Only Administrators are permitted to modify system escalation rules.");
        }

        EscalationRule rule = escalationRuleRepository.findByPriority(priority)
                .orElseGet(() -> buildDefaultRule(priority));

        if (request.getWarningThresholdPercent() != null) {
            rule.setWarningThresholdPercent(request.getWarningThresholdPercent());
        }
        if (request.getBreachLevel() != null) {
            rule.setBreachLevel(request.getBreachLevel());
        }
        if (request.getCriticalThresholdPercent() != null) {
            rule.setCriticalThresholdPercent(request.getCriticalThresholdPercent());
        }
        if (request.getAutoEscalateUnassigned() != null) {
            rule.setAutoEscalateUnassigned(request.getAutoEscalateUnassigned());
        }
        if (request.getIsActive() != null) {
            rule.setActive(request.getIsActive());
        }

        EscalationRule saved = escalationRuleRepository.save(rule);

        auditService.logEvent(
                "ESCALATION_RULE",
                saved.getId(),
                "ESCALATION_RULE_UPDATED",
                user,
                null,
                String.format("Updated %s rule: warn=%d%%, breachLevel=%d, crit=%d%%",
                        priority, saved.getWarningThresholdPercent(), saved.getBreachLevel(), saved.getCriticalThresholdPercent())
        );

        return EscalationRuleDto.fromEntity(saved);
    }

    private int resolveSlaHours(Incident incident) {
        if (incident.getSlaPolicy() != null) {
            return incident.getSlaPolicy().getResolutionTimeHours();
        }
        if (incident.getPriority() != null) {
            Optional<SlaPolicy> policy = slaPolicyRepository.findByPriority(incident.getPriority());
            if (policy.isPresent()) {
                return policy.get().getResolutionTimeHours();
            }
        }
        if (incident.getCategory() != null && incident.getCategory().getSlaHours() > 0) {
            return incident.getCategory().getSlaHours();
        }
        return switch (incident.getPriority() != null ? incident.getPriority() : Priority.MEDIUM) {
            case CRITICAL -> 4;
            case HIGH -> 8;
            case MEDIUM -> 24;
            case LOW -> 48;
        };
    }

    private EscalationRule buildDefaultRule(Priority priority) {
        int warn = (priority == Priority.CRITICAL || priority == Priority.HIGH) ? 75 : 80;
        int crit = (priority == Priority.CRITICAL || priority == Priority.HIGH) ? 150 : 160;
        boolean autoUnassigned = (priority != Priority.LOW);

        return EscalationRule.builder()
                .priority(priority)
                .warningThresholdPercent(warn)
                .breachLevel(2)
                .criticalThresholdPercent(crit)
                .autoEscalateUnassigned(autoUnassigned)
                .isActive(true)
                .build();
    }
}
