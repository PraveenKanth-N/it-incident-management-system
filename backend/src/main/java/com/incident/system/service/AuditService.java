package com.incident.system.service;

import com.incident.system.dto.AuditEventDto;
import com.incident.system.dto.PagedResponse;
import com.incident.system.entity.AuditEvent;
import com.incident.system.entity.User;
import com.incident.system.repository.AuditEventRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    @Transactional(propagation = Propagation.REQUIRED)
    public AuditEvent logEvent(String entityType, Long entityId, String action, User performedBy,
                               String previousState, String newState, String ipAddress) {
        AuditEvent event = AuditEvent.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .performedBy(performedBy)
                .previousState(previousState)
                .newState(newState)
                .ipAddress(ipAddress)
                .createdAt(Instant.now())
                .build();

        log.debug("Recording audit event: action={}, entityType={}, entityId={}, user={}",
                action, entityType, entityId, performedBy != null ? performedBy.getUsername() : "SYSTEM");
        return auditEventRepository.save(event);
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public AuditEvent logEvent(String entityType, Long entityId, String action, User performedBy,
                               String previousState, String newState) {
        return logEvent(entityType, entityId, action, performedBy, previousState, newState, null);
    }

    @Transactional(readOnly = true)
    public PagedResponse<AuditEventDto> getAuditEvents(String search, String entityType, String action,
                                                       String username, Instant startDate, Instant endDate,
                                                       Pageable pageable) {
        Specification<AuditEvent> spec = (root, query, cb) -> cb.conjunction();

        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> {
                Join<AuditEvent, User> userJoin = root.join("performedBy", JoinType.LEFT);
                return cb.or(
                    cb.like(cb.lower(root.get("action")), pattern),
                    cb.like(cb.lower(root.get("entityType")), pattern),
                    cb.like(cb.lower(userJoin.get("username")), pattern),
                    cb.like(cb.lower(userJoin.get("fullName")), pattern),
                    cb.like(root.get("entityId").as(String.class), "%" + search.trim() + "%")
                );
            });
        }

        if (entityType != null && !entityType.isBlank() && !entityType.equalsIgnoreCase("ALL")) {
            spec = spec.and((root, query, cb) -> 
                cb.equal(cb.upper(root.get("entityType")), entityType.trim().toUpperCase()));
        }

        if (action != null && !action.isBlank() && !action.equalsIgnoreCase("ALL")) {
            spec = spec.and((root, query, cb) -> 
                cb.equal(cb.upper(root.get("action")), action.trim().toUpperCase()));
        }

        if (username != null && !username.isBlank()) {
            spec = spec.and((root, query, cb) -> {
                Join<AuditEvent, User> userJoin = root.join("performedBy", JoinType.LEFT);
                return cb.equal(cb.lower(userJoin.get("username")), username.trim().toLowerCase());
            });
        }

        if (startDate != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
        }

        if (endDate != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
        }

        Page<AuditEvent> eventsPage = auditEventRepository.findAll(spec, pageable);
        return PagedResponse.of(eventsPage.map(AuditEventDto::fromEntity));
    }

    @Transactional(readOnly = true)
    public List<String> getDistinctEntityTypes() {
        return auditEventRepository.findDistinctEntityTypes();
    }

    @Transactional(readOnly = true)
    public List<String> getDistinctActions() {
        return auditEventRepository.findDistinctActions();
    }
}
