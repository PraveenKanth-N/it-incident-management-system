package com.incident.system.controller;

import com.incident.system.dto.ApiResponse;
import com.incident.system.dto.AuditEventDto;
import com.incident.system.dto.PagedResponse;
import com.incident.system.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<AuditEventDto>>> getAuditEvents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction) {

        Sort sort = direction.equalsIgnoreCase("ASC") ? 
                Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        PagedResponse<AuditEventDto> response = auditService.getAuditEvents(
                search, entityType, action, username, startDate, endDate, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/entity-types")
    public ResponseEntity<ApiResponse<List<String>>> getEntityTypes() {
        List<String> entityTypes = auditService.getDistinctEntityTypes();
        return ResponseEntity.ok(ApiResponse.ok(entityTypes));
    }

    @GetMapping("/actions")
    public ResponseEntity<ApiResponse<List<String>>> getActions() {
        List<String> actions = auditService.getDistinctActions();
        return ResponseEntity.ok(ApiResponse.ok(actions));
    }
}
