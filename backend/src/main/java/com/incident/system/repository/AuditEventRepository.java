package com.incident.system.repository;

import com.incident.system.entity.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, Long>, JpaSpecificationExecutor<AuditEvent> {
    List<AuditEvent> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, Long entityId);
    Page<AuditEvent> findAll(Pageable pageable);

    @Query("SELECT DISTINCT a.entityType FROM AuditEvent a ORDER BY a.entityType ASC")
    List<String> findDistinctEntityTypes();

    @Query("SELECT DISTINCT a.action FROM AuditEvent a ORDER BY a.action ASC")
    List<String> findDistinctActions();
}
