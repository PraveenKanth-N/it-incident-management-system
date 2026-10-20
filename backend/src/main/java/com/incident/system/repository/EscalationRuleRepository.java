package com.incident.system.repository;

import com.incident.system.entity.EscalationRule;
import com.incident.system.entity.Priority;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EscalationRuleRepository extends JpaRepository<EscalationRule, Long> {
    Optional<EscalationRule> findByPriority(Priority priority);
}
