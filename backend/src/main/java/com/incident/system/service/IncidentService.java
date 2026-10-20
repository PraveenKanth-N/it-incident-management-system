package com.incident.system.service;

import com.incident.system.dto.*;
import com.incident.system.entity.*;
import com.incident.system.exception.ConflictException;
import com.incident.system.exception.ResourceNotFoundException;
import com.incident.system.repository.*;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final IncidentCategoryRepository categoryRepository;
    private final SlaPolicyRepository slaPolicyRepository;
    private final UserRepository userRepository;
    private final IncidentStatusHistoryRepository statusHistoryRepository;
    private final IncidentAssignmentRepository assignmentRepository;
    private final IncidentCommentRepository commentRepository;
    private final AuditEventRepository auditEventRepository;
    private final PriorityCalculator priorityCalculator;
    private final TicketNumberGenerator ticketNumberGenerator;
    private final AuditService auditService;
    private final NotificationService notificationService;

    // Allowed status transitions state machine
    private static final Map<IncidentStatus, Set<IncidentStatus>> ALLOWED_TRANSITIONS = Map.of(
            IncidentStatus.OPEN, Set.of(IncidentStatus.TRIAGED, IncidentStatus.ASSIGNED, IncidentStatus.CLOSED),
            IncidentStatus.TRIAGED, Set.of(IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS, IncidentStatus.CLOSED),
            IncidentStatus.ASSIGNED, Set.of(IncidentStatus.IN_PROGRESS, IncidentStatus.TRIAGED, IncidentStatus.RESOLVED),
            IncidentStatus.IN_PROGRESS, Set.of(IncidentStatus.RESOLVED, IncidentStatus.ASSIGNED),
            IncidentStatus.RESOLVED, Set.of(IncidentStatus.CLOSED, IncidentStatus.IN_PROGRESS, IncidentStatus.OPEN),
            IncidentStatus.CLOSED, Set.of(IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS)
    );

    @Transactional(readOnly = true)
    public List<CategoryDto> getCategories() {
        return getCategories(false);
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> getCategories(boolean includeInactive) {
        return categoryRepository.findAll().stream()
                .filter(cat -> includeInactive || cat.isActive())
                .map(CategoryDto::fromEntity)
                .toList();
    }

    @Transactional
    public CategoryDto createCategory(CategoryRequest request, String adminUsername) {
        User adminUser = getAuthenticatedUser(adminUsername);
        if (categoryRepository.existsByName(request.getName().trim())) {
            throw new ConflictException("Category with name '" + request.getName().trim() + "' already exists");
        }

        IncidentCategory category = IncidentCategory.builder()
                .name(request.getName().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .slaHours(request.getSlaHours())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        IncidentCategory savedCategory = categoryRepository.save(category);

        auditService.logEvent(
                "CATEGORY",
                savedCategory.getId(),
                "CATEGORY_CREATED",
                adminUser,
                null,
                String.format("{\"name\":\"%s\",\"slaHours\":%d,\"isActive\":%b}",
                        savedCategory.getName(), savedCategory.getSlaHours(), savedCategory.isActive())
        );

        log.info("Administrator {} created incident category: id={}, name={}",
                adminUsername, savedCategory.getId(), savedCategory.getName());
        return CategoryDto.fromEntity(savedCategory);
    }

    @Transactional
    public CategoryDto updateCategory(Long id, CategoryRequest request, String adminUsername) {
        User adminUser = getAuthenticatedUser(adminUsername);
        IncidentCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident category not found with ID: " + id));

        if (categoryRepository.existsByNameAndIdNot(request.getName().trim(), id)) {
            throw new ConflictException("Category with name '" + request.getName().trim() + "' already exists");
        }

        String previousState = String.format("{\"name\":\"%s\",\"slaHours\":%d,\"isActive\":%b}",
                category.getName(), category.getSlaHours(), category.isActive());

        category.setName(request.getName().trim());
        category.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        category.setSlaHours(request.getSlaHours());
        if (request.getIsActive() != null) {
            category.setActive(request.getIsActive());
        }

        IncidentCategory updatedCategory = categoryRepository.save(category);

        String newState = String.format("{\"name\":\"%s\",\"slaHours\":%d,\"isActive\":%b}",
                updatedCategory.getName(), updatedCategory.getSlaHours(), updatedCategory.isActive());

        auditService.logEvent(
                "CATEGORY",
                updatedCategory.getId(),
                "CATEGORY_UPDATED",
                adminUser,
                previousState,
                newState
        );

        log.info("Administrator {} updated incident category: id={}, name={}",
                adminUsername, updatedCategory.getId(), updatedCategory.getName());
        return CategoryDto.fromEntity(updatedCategory);
    }

    @Transactional
    public CategoryDto toggleCategoryActive(Long id, String adminUsername) {
        User adminUser = getAuthenticatedUser(adminUsername);
        IncidentCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident category not found with ID: " + id));

        boolean oldStatus = category.isActive();
        boolean newStatus = !oldStatus;
        category.setActive(newStatus);
        IncidentCategory savedCategory = categoryRepository.save(category);

        String action = newStatus ? "CATEGORY_ACTIVATED" : "CATEGORY_DEACTIVATED";
        auditService.logEvent(
                "CATEGORY",
                savedCategory.getId(),
                action,
                adminUser,
                String.format("{\"isActive\":%b}", oldStatus),
                String.format("{\"isActive\":%b}", newStatus)
        );

        log.info("Administrator {} toggled category {} (id={}) active status from {} to {}",
                adminUsername, savedCategory.getName(), savedCategory.getId(), oldStatus, newStatus);
        return CategoryDto.fromEntity(savedCategory);
    }

    @Transactional(readOnly = true)
    public List<SlaPolicyDto> getSlaPolicies() {
        return slaPolicyRepository.findAll().stream()
                .map(SlaPolicyDto::fromEntity)
                .toList();
    }

    @Transactional
    public SlaPolicyDto updateSlaPolicy(Priority priority, UpdateSlaPolicyRequest request, String adminUsername) {
        User adminUser = getAuthenticatedUser(adminUsername);

        if (request.getResolutionTimeHours() < request.getResponseTimeHours()) {
            throw new IllegalArgumentException(String.format(
                    "Resolution target (%dh) cannot be shorter than response target (%dh)",
                    request.getResolutionTimeHours(), request.getResponseTimeHours()));
        }

        SlaPolicy policy = slaPolicyRepository.findByPriority(priority)
                .orElseThrow(() -> new ResourceNotFoundException("SLA policy not found for priority: " + priority));

        String previousState = String.format(
                "{\"priority\":\"%s\",\"responseTimeHours\":%d,\"resolutionTimeHours\":%d,\"isActive\":%b}",
                policy.getPriority(), policy.getResponseTimeHours(), policy.getResolutionTimeHours(), policy.isActive());

        policy.setResponseTimeHours(request.getResponseTimeHours());
        policy.setResolutionTimeHours(request.getResolutionTimeHours());
        if (request.getDescription() != null) {
            policy.setDescription(request.getDescription().trim());
        }
        if (request.getIsActive() != null) {
            policy.setActive(request.getIsActive());
        }

        SlaPolicy updatedPolicy = slaPolicyRepository.save(policy);

        String newState = String.format(
                "{\"priority\":\"%s\",\"responseTimeHours\":%d,\"resolutionTimeHours\":%d,\"isActive\":%b}",
                updatedPolicy.getPriority(), updatedPolicy.getResponseTimeHours(), updatedPolicy.getResolutionTimeHours(), updatedPolicy.isActive());

        auditService.logEvent(
                "SLA_POLICY",
                updatedPolicy.getId(),
                "SLA_POLICY_UPDATED",
                adminUser,
                previousState,
                newState
        );

        log.info("Administrator {} updated SLA policy: priority={}, responseHours={}, resolutionHours={}",
                adminUsername, priority, updatedPolicy.getResponseTimeHours(), updatedPolicy.getResolutionTimeHours());
        return SlaPolicyDto.fromEntity(updatedPolicy);
    }

    @Transactional
    public IncidentResponse createIncident(CreateIncidentRequest request, String username) {
        User reporter = getAuthenticatedUser(username);

        IncidentCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Incident category not found with ID: " + request.getCategoryId()));

        // Calculate and validate priority against impact and urgency matrix
        Priority calculatedPriority = priorityCalculator.validateOrCalculate(
                request.getImpact(), request.getUrgency(), request.getPriority());

        // Associate matching SLA Policy
        SlaPolicy slaPolicy = slaPolicyRepository.findByPriority(calculatedPriority).orElse(null);

        // Generate collision-resistant unique ticket number
        String ticketNumber = ticketNumberGenerator.generateTicketNumber();

        Incident incident = Incident.builder()
                .ticketNumber(ticketNumber)
                .title(request.getTitle().trim())
                .description(request.getDescription().trim())
                .impact(request.getImpact())
                .urgency(request.getUrgency())
                .priority(calculatedPriority)
                .status(IncidentStatus.OPEN)
                .category(category)
                .reporter(reporter)
                .assignee(null)
                .slaPolicy(slaPolicy)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Incident savedIncident = incidentRepository.save(incident);

        // Record initial status in status history
        IncidentStatusHistory initialHistory = IncidentStatusHistory.builder()
                .incident(savedIncident)
                .oldStatus(null)
                .newStatus(IncidentStatus.OPEN)
                .changedBy(reporter)
                .changeReason("Incident created by " + reporter.getUsername())
                .createdAt(Instant.now())
                .build();
        statusHistoryRepository.save(initialHistory);

        // Record audit event
        auditService.logEvent(
                "INCIDENT",
                savedIncident.getId(),
                "INCIDENT_CREATED",
                reporter,
                null,
                String.format("Ticket %s created (Category: %s, Priority: %s)",
                        savedIncident.getTicketNumber(), category.getName(), calculatedPriority)
        );

        notificationService.notifyIncidentCreated(savedIncident);

        log.info("Incident created successfully: ticketNumber={}, reporter={}", ticketNumber, reporter.getUsername());
        return IncidentResponse.fromEntity(savedIncident);
    }

    @Transactional(readOnly = true)
    public PagedResponse<IncidentResponse> getIncidents(
            IncidentStatus status,
            Priority priority,
            Long categoryId,
            String search,
            Long reporterId,
            Long assigneeId,
            Pageable pageable,
            String username) {

        User currentUser = getAuthenticatedUser(username);
        boolean isEmployee = currentUser.getRole().getName() == RoleName.ROLE_EMPLOYEE;

        Specification<Incident> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Object-level isolation: employees can ONLY see their own incidents
            if (isEmployee) {
                predicates.add(cb.equal(root.get("reporter").get("id"), currentUser.getId()));
            } else if (reporterId != null) {
                predicates.add(cb.equal(root.get("reporter").get("id"), reporterId));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (priority != null) {
                predicates.add(cb.equal(root.get("priority"), priority));
            }

            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }

            if (assigneeId != null) {
                predicates.add(cb.equal(root.get("assignee").get("id"), assigneeId));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate searchPredicate = cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("ticketNumber")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern)
                );
                predicates.add(searchPredicate);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Incident> page = incidentRepository.findAll(spec, pageable);
        List<IncidentResponse> content = page.getContent().stream()
                .map(IncidentResponse::fromEntity)
                .toList();

        return PagedResponse.<IncidentResponse>builder()
                .content(content)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public IncidentResponse getIncidentById(Long id, String username) {
        Incident incident = getIncidentEntity(id);
        User currentUser = getAuthenticatedUser(username);

        // Object-level access check for employees
        checkEmployeeOwnership(currentUser, incident, "view");

        return IncidentResponse.fromEntity(incident);
    }

    @Transactional
    public IncidentResponse updateIncident(Long id, UpdateIncidentRequest request, String username) {
        Incident incident = getIncidentEntity(id);
        User currentUser = getAuthenticatedUser(username);

        boolean isEmployee = currentUser.getRole().getName() == RoleName.ROLE_EMPLOYEE;
        if (isEmployee) {
            checkEmployeeOwnership(currentUser, incident, "update");

            // Employees may only update their incident if it is still OPEN or TRIAGED
            if (incident.getStatus() != IncidentStatus.OPEN && incident.getStatus() != IncidentStatus.TRIAGED) {
                throw new AccessDeniedException(
                        "Employees cannot edit incident details once work has commenced or ticket is resolved. Please add a comment instead.");
            }

            if (request.getTitle() != null && !request.getTitle().isBlank()) {
                incident.setTitle(request.getTitle().trim());
            }
            if (request.getDescription() != null && !request.getDescription().isBlank()) {
                incident.setDescription(request.getDescription().trim());
            }
        } else {
            // Technicians and Admins can update permitted fields
            if (request.getTitle() != null && !request.getTitle().isBlank()) {
                incident.setTitle(request.getTitle().trim());
            }
            if (request.getDescription() != null && !request.getDescription().isBlank()) {
                incident.setDescription(request.getDescription().trim());
            }
            if (request.getCategoryId() != null) {
                IncidentCategory category = categoryRepository.findById(request.getCategoryId())
                        .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));
                incident.setCategory(category);
            }

            // Impact / Urgency modification recalculates priority & SLA
            if (request.getImpact() != null || request.getUrgency() != null) {
                Impact newImpact = request.getImpact() != null ? request.getImpact() : incident.getImpact();
                Urgency newUrgency = request.getUrgency() != null ? request.getUrgency() : incident.getUrgency();
                Priority newPriority = priorityCalculator.validateOrCalculate(newImpact, newUrgency, request.getPriority());

                incident.setImpact(newImpact);
                incident.setUrgency(newUrgency);
                incident.setPriority(newPriority);

                SlaPolicy slaPolicy = slaPolicyRepository.findByPriority(newPriority).orElse(null);
                incident.setSlaPolicy(slaPolicy);
            }
        }

        incident.setUpdatedAt(Instant.now());
        Incident saved = incidentRepository.save(incident);

        auditService.logEvent(
                "INCIDENT",
                saved.getId(),
                "INCIDENT_UPDATED",
                currentUser,
                null,
                "Incident details updated by " + currentUser.getUsername()
        );

        return IncidentResponse.fromEntity(saved);
    }

    @Transactional
    public IncidentResponse updateIncidentStatus(Long id, UpdateIncidentStatusRequest request, String username) {
        Incident incident = getIncidentEntity(id);
        User currentUser = getAuthenticatedUser(username);

        IncidentStatus oldStatus = incident.getStatus();
        IncidentStatus newStatus = request.getStatus();

        if (oldStatus == newStatus) {
            return IncidentResponse.fromEntity(incident);
        }

        // Validate state machine transitions
        Set<IncidentStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(oldStatus, Set.of());
        if (!allowed.contains(newStatus)) {
            throw new IllegalArgumentException(String.format(
                    "Invalid status transition from '%s' to '%s'. Allowed transitions from '%s' are: %s",
                    oldStatus, newStatus, oldStatus, allowed
            ));
        }

        boolean isEmployee = currentUser.getRole().getName() == RoleName.ROLE_EMPLOYEE;
        boolean isAdmin = currentUser.getRole().getName() == RoleName.ROLE_ADMIN;

        // Role-based restrictions on transitions
        if (isEmployee) {
            checkEmployeeOwnership(currentUser, incident, "change status of");

            boolean isEmployeeAllowedTransition =
                    (oldStatus == IncidentStatus.OPEN && newStatus == IncidentStatus.CLOSED) ||
                    (oldStatus == IncidentStatus.RESOLVED && newStatus == IncidentStatus.CLOSED) ||
                    (oldStatus == IncidentStatus.RESOLVED && (newStatus == IncidentStatus.IN_PROGRESS || newStatus == IncidentStatus.OPEN));

            if (!isEmployeeAllowedTransition) {
                throw new AccessDeniedException(String.format(
                        "Employees are not permitted to transition incidents from '%s' to '%s'.",
                        oldStatus, newStatus
                ));
            }
        }

        // Only ADMIN may reopen a permanently CLOSED incident
        if (oldStatus == IncidentStatus.CLOSED && !isAdmin) {
            throw new AccessDeniedException("Only Administrators are permitted to reopen a permanently CLOSED incident.");
        }

        // When transitioning to RESOLVED, resolution notes are required
        if (newStatus == IncidentStatus.RESOLVED) {
            String notes = request.getResolutionNotes();
            if ((notes == null || notes.isBlank()) && (incident.getResolutionNotes() == null || incident.getResolutionNotes().isBlank())) {
                throw new IllegalArgumentException("Resolution notes are required when marking an incident as RESOLVED.");
            }
            if (notes != null && !notes.isBlank()) {
                incident.setResolutionNotes(notes.trim());
            }
            incident.setResolvedAt(Instant.now());
        } else if (oldStatus == IncidentStatus.RESOLVED || oldStatus == IncidentStatus.CLOSED) {
            // Reopening incident clears resolvedAt timestamp
            incident.setResolvedAt(null);
        }

        incident.setStatus(newStatus);
        incident.setUpdatedAt(Instant.now());
        Incident savedIncident = incidentRepository.save(incident);

        String changeReason = request.getReason() != null && !request.getReason().isBlank()
                ? request.getReason().trim()
                : "Status transitioned from " + oldStatus + " to " + newStatus;

        // Persist status history
        IncidentStatusHistory history = IncidentStatusHistory.builder()
                .incident(savedIncident)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .changedBy(currentUser)
                .changeReason(changeReason)
                .createdAt(Instant.now())
                .build();
        statusHistoryRepository.save(history);

        // Record audit event
        auditService.logEvent(
                "INCIDENT",
                savedIncident.getId(),
                "INCIDENT_STATUS_CHANGED",
                currentUser,
                oldStatus.name(),
                newStatus.name()
        );

        notificationService.notifyStatusChanged(savedIncident, oldStatus, newStatus, currentUser);

        log.info("Incident status updated: id={}, ticket={}, oldStatus={}, newStatus={}, actor={}",
                id, savedIncident.getTicketNumber(), oldStatus, newStatus, currentUser.getUsername());
        return IncidentResponse.fromEntity(savedIncident);
    }

    @Transactional
    public IncidentResponse assignIncident(Long id, AssignIncidentRequest request, String username) {
        Incident incident = getIncidentEntity(id);
        User currentUser = getAuthenticatedUser(username);

        // Only Technicians and Admins may assign incidents
        if (currentUser.getRole().getName() == RoleName.ROLE_EMPLOYEE) {
            throw new AccessDeniedException("Employees are not authorized to assign or reassign incidents.");
        }

        User newAssignee = userRepository.findById(request.getAssigneeId())
                .orElseThrow(() -> new ResourceNotFoundException("Assignee user not found with ID: " + request.getAssigneeId()));

        if (!newAssignee.isActive()) {
            throw new IllegalArgumentException("Cannot assign incident to inactive user: " + newAssignee.getUsername());
        }

        if (newAssignee.getRole().getName() != RoleName.ROLE_TECHNICIAN && newAssignee.getRole().getName() != RoleName.ROLE_ADMIN) {
            throw new IllegalArgumentException(String.format(
                    "Assignee must have the Technician role. User '%s' has role '%s'.",
                    newAssignee.getUsername(), newAssignee.getRole().getName()
            ));
        }

        User previousAssignee = incident.getAssignee();
        incident.setAssignee(newAssignee);

        // If status was OPEN or TRIAGED, automatically transition to ASSIGNED
        IncidentStatus currentStatus = incident.getStatus();
        if (currentStatus == IncidentStatus.OPEN || currentStatus == IncidentStatus.TRIAGED) {
            incident.setStatus(IncidentStatus.ASSIGNED);

            IncidentStatusHistory statusHistory = IncidentStatusHistory.builder()
                    .incident(incident)
                    .oldStatus(currentStatus)
                    .newStatus(IncidentStatus.ASSIGNED)
                    .changedBy(currentUser)
                    .changeReason("Auto-transitioned to ASSIGNED upon assignment to " + newAssignee.getUsername())
                    .createdAt(Instant.now())
                    .build();
            statusHistoryRepository.save(statusHistory);
        }

        incident.setUpdatedAt(Instant.now());
        Incident savedIncident = incidentRepository.save(incident);

        String assignmentNotes = request.getNotes() != null && !request.getNotes().isBlank()
                ? request.getNotes().trim() : null;

        // Persist assignment history
        IncidentAssignment assignment = IncidentAssignment.builder()
                .incident(savedIncident)
                .assignedBy(currentUser)
                .previousAssignee(previousAssignee)
                .assignedTo(newAssignee)
                .assignmentNotes(assignmentNotes)
                .assignedAt(Instant.now())
                .build();
        assignmentRepository.save(assignment);

        // Record audit event
        auditService.logEvent(
                "INCIDENT",
                savedIncident.getId(),
                "INCIDENT_ASSIGNMENT_CHANGED",
                currentUser,
                previousAssignee != null ? previousAssignee.getUsername() : "UNASSIGNED",
                newAssignee.getUsername()
        );

        notificationService.notifyIncidentAssigned(savedIncident, previousAssignee, newAssignee, currentUser);

        log.info("Incident assigned: id={}, ticket={}, previousAssignee={}, newAssignee={}, actor={}",
                id, savedIncident.getTicketNumber(),
                previousAssignee != null ? previousAssignee.getUsername() : "NONE",
                newAssignee.getUsername(), currentUser.getUsername());
        return IncidentResponse.fromEntity(savedIncident);
    }

    @Transactional(readOnly = true)
    public IncidentHistoryResponse getIncidentHistory(Long id, String username) {
        Incident incident = getIncidentEntity(id);
        User currentUser = getAuthenticatedUser(username);

        checkEmployeeOwnership(currentUser, incident, "view history of");

        List<IncidentStatusHistoryResponse> statusHistories = statusHistoryRepository
                .findByIncidentIdOrderByCreatedAtDesc(id)
                .stream()
                .map(IncidentStatusHistoryResponse::fromEntity)
                .toList();

        List<IncidentAssignmentResponse> assignmentHistories = assignmentRepository
                .findByIncidentIdOrderByAssignedAtDesc(id)
                .stream()
                .map(IncidentAssignmentResponse::fromEntity)
                .toList();

        List<AuditEventResponse> auditEvents = auditEventRepository
                .findByEntityTypeAndEntityIdOrderByCreatedAtDesc("INCIDENT", id)
                .stream()
                .map(AuditEventResponse::fromEntity)
                .toList();

        return IncidentHistoryResponse.builder()
                .incidentId(incident.getId())
                .ticketNumber(incident.getTicketNumber())
                .statusHistory(statusHistories)
                .assignmentHistory(assignmentHistories)
                .auditEvents(auditEvents)
                .build();
    }

    @Transactional(readOnly = true)
    public List<IncidentCommentResponse> getIncidentComments(Long id, String username) {
        Incident incident = getIncidentEntity(id);
        User currentUser = getAuthenticatedUser(username);

        checkEmployeeOwnership(currentUser, incident, "view comments of");

        boolean isEmployee = currentUser.getRole().getName() == RoleName.ROLE_EMPLOYEE;
        List<IncidentComment> comments;

        if (isEmployee) {
            // Employees strictly only see non-internal comments
            comments = commentRepository.findByIncidentIdAndIsInternalFalseOrderByCreatedAtAsc(id);
        } else {
            // Technicians and Admins see all comments including internal work notes
            comments = commentRepository.findByIncidentIdOrderByCreatedAtAsc(id);
        }

        return comments.stream()
                .map(IncidentCommentResponse::fromEntity)
                .toList();
    }

    @Transactional
    public IncidentCommentResponse addComment(Long id, CreateCommentRequest request, String username) {
        Incident incident = getIncidentEntity(id);
        User currentUser = getAuthenticatedUser(username);

        checkEmployeeOwnership(currentUser, incident, "comment on");

        boolean isEmployee = currentUser.getRole().getName() == RoleName.ROLE_EMPLOYEE;
        boolean isInternal = Boolean.TRUE.equals(request.getIsInternal());

        if (isEmployee && isInternal) {
            throw new AccessDeniedException("Employees are not authorized to create internal work notes.");
        }

        IncidentComment comment = IncidentComment.builder()
                .incident(incident)
                .author(currentUser)
                .commentText(request.getCommentText().trim())
                .isInternal(!isEmployee && isInternal)
                .createdAt(Instant.now())
                .build();

        IncidentComment savedComment = commentRepository.save(comment);

        auditService.logEvent(
                "INCIDENT",
                incident.getId(),
                comment.isInternal() ? "INTERNAL_NOTE_ADDED" : "COMMENT_ADDED",
                currentUser,
                null,
                "Comment ID: " + savedComment.getId()
        );

        log.info("Incident comment added: incidentId={}, author={}, isInternal={}",
                id, currentUser.getUsername(), comment.isInternal());
        return IncidentCommentResponse.fromEntity(savedComment);
    }

    private Incident getIncidentEntity(Long id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found with ID: " + id));
    }

    private User getAuthenticatedUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    private void checkEmployeeOwnership(User user, Incident incident, String action) {
        if (user.getRole().getName() == RoleName.ROLE_EMPLOYEE) {
            if (!incident.getReporter().getId().equals(user.getId())) {
                throw new AccessDeniedException(String.format(
                        "Access denied: You are not authorized to %s an incident reported by another user.", action));
            }
        }
    }
}
