package com.incident.system.repository;

import com.incident.system.entity.IncidentCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IncidentCategoryRepository extends JpaRepository<IncidentCategory, Long> {
    Optional<IncidentCategory> findByName(String name);
    boolean existsByName(String name);
    boolean existsByNameAndIdNot(String name, Long id);
    List<IncidentCategory> findByIsActiveTrue();
    List<IncidentCategory> findAllByOrderByNameAsc();
}
