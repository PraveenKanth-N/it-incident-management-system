package com.incident.system.controller;

import com.incident.system.dto.*;
import com.incident.system.entity.IncidentStatus;
import com.incident.system.entity.Priority;
import com.incident.system.service.IncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;

    @PostMapping
    public ResponseEntity<ApiResponse<IncidentResponse>> createIncident(
            @Valid @RequestBody CreateIncidentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        IncidentResponse response = incidentService.createIncident(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Incident created successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<IncidentResponse>>> getIncidents(
            @RequestParam(required = false) IncidentStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long reporterId,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction,
            @AuthenticationPrincipal UserDetails userDetails) {

        Sort sort = direction.equalsIgnoreCase("ASC") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        PagedResponse<IncidentResponse> response = incidentService.getIncidents(
                status, priority, categoryId, search, reporterId, assigneeId, pageable, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<CategoryDto>>> getCategories(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        List<CategoryDto> categories = incidentService.getCategories(includeInactive);
        return ResponseEntity.ok(ApiResponse.ok(categories));
    }

    @PostMapping("/categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryDto>> createCategory(
            @Valid @RequestBody CategoryRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        CategoryDto created = incidentService.createCategory(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Category created successfully", created));
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryDto>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        CategoryDto updated = incidentService.updateCategory(id, request, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Category updated successfully", updated));
    }

    @PatchMapping("/categories/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryDto>> toggleCategoryStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        CategoryDto updated = incidentService.toggleCategoryActive(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Category status toggled successfully", updated));
    }

    @GetMapping("/sla-policies")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ApiResponse<List<SlaPolicyDto>>> getSlaPolicies() {
        List<SlaPolicyDto> policies = incidentService.getSlaPolicies();
        return ResponseEntity.ok(ApiResponse.ok(policies));
    }

    @PutMapping("/sla-policies/{priority}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SlaPolicyDto>> updateSlaPolicy(
            @PathVariable Priority priority,
            @Valid @RequestBody UpdateSlaPolicyRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        SlaPolicyDto updated = incidentService.updateSlaPolicy(priority, request, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("SLA policy updated successfully", updated));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IncidentResponse>> getIncidentById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        IncidentResponse response = incidentService.getIncidentById(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<IncidentResponse>> updateIncident(
            @PathVariable Long id,
            @Valid @RequestBody UpdateIncidentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        IncidentResponse response = incidentService.updateIncident(id, request, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Incident updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<IncidentResponse>> updateIncidentStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateIncidentStatusRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        IncidentResponse response = incidentService.updateIncidentStatus(id, request, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Incident status updated successfully", response));
    }

    @PatchMapping("/{id}/assignment")
    public ResponseEntity<ApiResponse<IncidentResponse>> assignIncident(
            @PathVariable Long id,
            @Valid @RequestBody AssignIncidentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        IncidentResponse response = incidentService.assignIncident(id, request, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Incident assigned successfully", response));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<ApiResponse<IncidentHistoryResponse>> getIncidentHistory(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        IncidentHistoryResponse response = incidentService.getIncidentHistory(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<List<IncidentCommentResponse>>> getIncidentComments(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<IncidentCommentResponse> comments = incidentService.getIncidentComments(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(comments));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<IncidentCommentResponse>> addComment(
            @PathVariable Long id,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        IncidentCommentResponse response = incidentService.addComment(id, request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Comment added successfully", response));
    }
}
