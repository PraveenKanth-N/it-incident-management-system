package com.incident.system.repository;

import com.incident.system.entity.RoleName;
import com.incident.system.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<User> findByRoleName(RoleName roleName);
    Page<User> findAll(Pageable pageable);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role.name = :roleName AND u.isActive = true")
    long countByRoleNameAndIsActiveTrue(@Param("roleName") RoleName roleName);
}
