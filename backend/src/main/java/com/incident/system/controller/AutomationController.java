package com.incident.system.controller;

import com.incident.system.dto.ApiResponse;
import com.incident.system.dto.EscalationRuleDto;
import com.incident.system.dto.EscalationScanResultDto;
import com.incident.system.dto.UpdateEscalationRuleRequest;
import com.incident.system.entity.Priority;
import com.incident.system.service.NotificationService;
import com.incident.system.service.SlaEscalationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/automation")
@RequiredArgsConstructor
public class AutomationController {

    private final SlaEscalationService slaEscalationService;
    private final NotificationService notificationService;

    @GetMapping("/escalation/rules")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ApiResponse<List<EscalationRuleDto>>> getEscalationRules() {
        List<EscalationRuleDto> rules = slaEscalationService.getEscalationRules();
        return ResponseEntity.ok(ApiResponse.success(rules));
    }

    @PutMapping("/escalation/rules/{priority}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EscalationRuleDto>> updateEscalationRule(
            @PathVariable Priority priority,
            @Valid @RequestBody UpdateEscalationRuleRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        EscalationRuleDto updated = slaEscalationService.updateEscalationRule(
                priority, request, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Escalation rule updated successfully", updated));
    }

    @PostMapping("/escalation/run")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EscalationScanResultDto>> triggerEscalationScan(
            @AuthenticationPrincipal UserDetails userDetails) {
        EscalationScanResultDto result = slaEscalationService.runEscalationScan();
        return ResponseEntity.ok(ApiResponse.success("SLA escalation scan completed successfully", result));
    }

    @PostMapping("/notifications/retry")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> retryFailedNotifications(
            @AuthenticationPrincipal UserDetails userDetails) {
        int retriedCount = notificationService.retryPendingNotifications();
        return ResponseEntity.ok(ApiResponse.success("Pending notifications retried", Map.of("retriedCount", retriedCount)));
    }
}
