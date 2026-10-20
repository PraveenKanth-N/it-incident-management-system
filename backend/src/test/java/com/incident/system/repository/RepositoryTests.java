package com.incident.system.repository;

import com.incident.system.entity.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class RepositoryTests {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SlaPolicyRepository slaPolicyRepository;

    @Autowired
    private IncidentCategoryRepository categoryRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Test
    @DisplayName("Role Repository - Saves and looks up roles by RoleName enum")
    void testRoleRepository() {
        Role adminRole = roleRepository.save(new Role(RoleName.ROLE_ADMIN, "System Administrator"));
        Optional<Role> found = roleRepository.findByName(RoleName.ROLE_ADMIN);

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isNotNull();
        assertThat(found.get().getName()).isEqualTo(RoleName.ROLE_ADMIN);
    }

    @Test
    @DisplayName("User Repository - Saves user with foreign key to Role and finds by username and email")
    void testUserRepository() {
        Role role = roleRepository.save(new Role(RoleName.ROLE_TECHNICIAN, "Support Technician"));

        User user = User.builder()
                .username("tech.agent")
                .email("tech.agent@example.com")
                .passwordHash("$2a$12$securehash")
                .fullName("Tech Agent")
                .role(role)
                .department("IT Operations")
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);

        assertThat(savedUser.getId()).isNotNull();
        assertThat(userRepository.findByUsername("tech.agent")).isPresent();
        assertThat(userRepository.findByEmail("tech.agent@example.com")).isPresent();
        assertThat(userRepository.existsByUsername("tech.agent")).isTrue();
        assertThat(userRepository.existsByUsername("nonexistent")).isFalse();
    }

    @Test
    @DisplayName("SLA Policy Repository - Saves and finds policy by Priority enum")
    void testSlaPolicyRepository() {
        SlaPolicy sla = SlaPolicy.builder()
                .name("Critical SLA")
                .priority(Priority.CRITICAL)
                .responseTimeHours(1)
                .resolutionTimeHours(4)
                .description("Immediate response needed")
                .isActive(true)
                .build();

        slaPolicyRepository.save(sla);

        Optional<SlaPolicy> found = slaPolicyRepository.findByPriority(Priority.CRITICAL);
        assertThat(found).isPresent();
        assertThat(found.get().getResponseTimeHours()).isEqualTo(1);
        assertThat(found.get().getResolutionTimeHours()).isEqualTo(4);
    }

    @Test
    @DisplayName("Incident Repository - Saves incident with category, reporter, assignee, and SLA policy")
    void testIncidentRepository() {
        Role empRole = roleRepository.save(new Role(RoleName.ROLE_EMPLOYEE, "Employee"));
        Role techRole = roleRepository.save(new Role(RoleName.ROLE_TECHNICIAN, "Technician"));

        User reporter = userRepository.save(User.builder()
                .username("emp.sam")
                .email("sam@example.com")
                .passwordHash("hash")
                .fullName("Sam Employee")
                .role(empRole)
                .isActive(true)
                .build());

        User assignee = userRepository.save(User.builder()
                .username("tech.dan")
                .email("dan@example.com")
                .passwordHash("hash")
                .fullName("Dan Technician")
                .role(techRole)
                .isActive(true)
                .build());

        IncidentCategory category = categoryRepository.save(IncidentCategory.builder()
                .name("Network")
                .description("Network outage")
                .slaHours(2)
                .build());

        SlaPolicy sla = slaPolicyRepository.save(SlaPolicy.builder()
                .name("High SLA")
                .priority(Priority.HIGH)
                .responseTimeHours(2)
                .resolutionTimeHours(8)
                .build());

        Incident incident = Incident.builder()
                .ticketNumber("INC-TEST-001")
                .title("Switch Failure in Building B")
                .description("Cisco switch unreachable")
                .impact(Impact.HIGH)
                .urgency(Urgency.HIGH)
                .priority(Priority.HIGH)
                .status(IncidentStatus.OPEN)
                .category(category)
                .reporter(reporter)
                .assignee(assignee)
                .slaPolicy(sla)
                .build();

        Incident savedIncident = incidentRepository.save(incident);

        assertThat(savedIncident.getId()).isNotNull();
        assertThat(incidentRepository.findByTicketNumber("INC-TEST-001")).isPresent();
    }
}
