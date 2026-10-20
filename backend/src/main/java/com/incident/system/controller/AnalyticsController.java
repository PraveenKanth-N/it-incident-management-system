package com.incident.system.controller;

import com.incident.system.dto.analytics.*;
import com.incident.system.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardMetricsResponse> getDashboardMetrics(
            @ModelAttribute AnalyticsFilterRequest filter,
            Authentication authentication) {
        log.debug("GET /api/v1/analytics/dashboard requested by {}", authentication.getName());
        DashboardMetricsResponse response = analyticsService.getDashboardMetrics(filter, authentication.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/trends")
    public ResponseEntity<List<TrendDataPointDto>> getTrends(
            @ModelAttribute AnalyticsFilterRequest filter,
            Authentication authentication) {
        log.debug("GET /api/v1/analytics/trends requested by {}", authentication.getName());
        List<TrendDataPointDto> response = analyticsService.getTrends(filter, authentication.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/technicians")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<List<TechnicianWorkloadDto>> getTechnicianWorkload(
            @ModelAttribute AnalyticsFilterRequest filter,
            Authentication authentication) {
        log.debug("GET /api/v1/analytics/technicians requested by {}", authentication.getName());
        List<TechnicianWorkloadDto> response = analyticsService.getTechnicianWorkload(filter, authentication.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCsv(
            @ModelAttribute AnalyticsFilterRequest filter,
            Authentication authentication) {
        log.info("GET /api/v1/analytics/export/csv requested by {}", authentication.getName());
        byte[] csvBytes = analyticsService.exportIncidentsCsv(filter, authentication.getName());

        String timestamp = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")
                .withZone(ZoneOffset.UTC)
                .format(Instant.now());
        String filename = "incident_report_" + timestamp + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .contentLength(csvBytes.length)
                .body(csvBytes);
    }
}
