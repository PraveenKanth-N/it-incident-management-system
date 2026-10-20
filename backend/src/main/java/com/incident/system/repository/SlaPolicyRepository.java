package com.incident.system.repository;

import com.incident.system.entity.Priority;
import com.incident.system.entity.SlaPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SlaPolicyRepository extends JpaRepository<SlaPolicy, Long> {
    Optional<SlaPolicy> findByPriority(Priority priority);
    List<SlaPolicy> findByIsActiveTrue();
}
