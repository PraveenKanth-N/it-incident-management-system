package com.incident.system.repository;

import com.incident.system.entity.IncidentAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentAssignmentRepository extends JpaRepository<IncidentAssignment, Long> {
    List<IncidentAssignment> findByIncidentIdOrderByAssignedAtDesc(Long incidentId);
}
