package com.incident.system.repository;

import com.incident.system.entity.IncidentComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentCommentRepository extends JpaRepository<IncidentComment, Long> {
    List<IncidentComment> findByIncidentIdOrderByCreatedAtAsc(Long incidentId);
    List<IncidentComment> findByIncidentIdAndIsInternalFalseOrderByCreatedAtAsc(Long incidentId);
}
