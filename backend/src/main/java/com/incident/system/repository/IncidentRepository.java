package com.incident.system.repository;

import com.incident.system.entity.Incident;
import com.incident.system.entity.IncidentStatus;
import com.incident.system.entity.Priority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long>, JpaSpecificationExecutor<Incident> {
    Optional<Incident> findByTicketNumber(String ticketNumber);
    boolean existsByTicketNumber(String ticketNumber);
    Page<Incident> findByReporterId(Long reporterId, Pageable pageable);
    Page<Incident> findByAssigneeId(Long assigneeId, Pageable pageable);
    Page<Incident> findByStatus(IncidentStatus status, Pageable pageable);
    Page<Incident> findByPriority(Priority priority, Pageable pageable);
    Page<Incident> findAll(Pageable pageable);
    java.util.List<Incident> findByStatusNotIn(java.util.Collection<IncidentStatus> statuses);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT i FROM Incident i " +
            "LEFT JOIN FETCH i.slaPolicy " +
            "LEFT JOIN FETCH i.category " +
            "LEFT JOIN FETCH i.reporter " +
            "LEFT JOIN FETCH i.assignee " +
            "WHERE i.status NOT IN :statuses")
    java.util.List<Incident> findActiveIncidentsForEscalation(
            @org.springframework.data.repository.query.Param("statuses") java.util.Collection<IncidentStatus> statuses);
}
