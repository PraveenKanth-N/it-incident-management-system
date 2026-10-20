package com.incident.system.service;

import com.incident.system.dto.*;
import com.incident.system.entity.*;
import com.incident.system.exception.ConflictException;
import com.incident.system.exception.ResourceNotFoundException;
import com.incident.system.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdministrationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private IncidentCategoryRepository categoryRepository;

    @Mock
    private SlaPolicyRepository slaPolicyRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private UserService userService;

    @Mock
    private IncidentRepository incidentRepository;
    @Mock
    private IncidentStatusHistoryRepository statusHistoryRepository;
    @Mock
    private IncidentAssignmentRepository assignmentRepository;
    @Mock
    private IncidentCommentRepository commentRepository;
    @Mock
    private AuditEventRepository auditEventRepository;
    @Mock
    private NotificationService notificationService;

    private IncidentService incidentService;

    private Role adminRole;
    private Role techRole;
    private Role empRole;

    private User rootAdmin;
    private User secondAdmin;
    private User technician;
    private User employee;

    private IncidentCategory category;
    private SlaPolicy criticalPolicy;

    @BeforeEach
    void setUp() {
        incidentService = new IncidentService(
                incidentRepository,
                categoryRepository,
                slaPolicyRepository,
                userRepository,
                statusHistoryRepository,
                assignmentRepository,
                commentRepository,
                auditEventRepository,
                null, // priorityCalculator
                null, // ticketNumberGenerator
                auditService,
                notificationService
        );

        adminRole = Role.builder().id(1L).name(RoleName.ROLE_ADMIN).description("Admin").build();
        techRole = Role.builder().id(2L).name(RoleName.ROLE_TECHNICIAN).description("Technician").build();
        empRole = Role.builder().id(3L).name(RoleName.ROLE_EMPLOYEE).description("Employee").build();

        rootAdmin = User.builder()
                .id(1L)
                .username("admin.root")
                .email("admin@resolv.internal")
                .fullName("Root Admin")
                .role(adminRole)
                .isActive(true)
                .build();

        secondAdmin = User.builder()
                .id(2L)
                .username("admin.secondary")
                .email("admin2@resolv.internal")
                .fullName("Secondary Admin")
                .role(adminRole)
                .isActive(true)
                .build();

        technician = User.builder()
                .id(3L)
                .username("tech.dave")
                .email("dave@resolv.internal")
                .fullName("Dave Technician")
                .role(techRole)
                .isActive(true)
                .build();

        employee = User.builder()
                .id(4L)
                .username("emp.alice")
                .email("alice@resolv.internal")
                .fullName("Alice Employee")
                .role(empRole)
                .isActive(true)
                .build();

        category = IncidentCategory.builder()
                .id(10L)
                .name("Network Infrastructure")
                .description("VPN and core network")
                .slaHours(12)
                .isActive(true)
                .build();

        criticalPolicy = SlaPolicy.builder()
                .id(100L)
                .name("Critical SLA")
                .priority(Priority.CRITICAL)
                .responseTimeHours(1)
                .resolutionTimeHours(4)
                .isActive(true)
                .build();
    }

    // ==========================================
    // 1. User Administration & Safeguard Tests
    // ==========================================

    @Test
    @DisplayName("User Status - Admin can safely deactivate non-admin user")
    void updateUserStatus_DeactivatesNormalUser_Success() {
        when(userRepository.findById(3L)).thenReturn(Optional.of(technician));
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UpdateUserStatusRequest req = UpdateUserStatusRequest.builder().isActive(false).build();
        UserSummaryDto result = userService.updateUserStatus(3L, req, "admin.root");

        assertThat(result.isActive()).isFalse();
        verify(auditService).logEvent(eq("USER"), eq(3L), eq("USER_DEACTIVATED"), eq(rootAdmin), any(), any());
    }

    @Test
    @DisplayName("User Status - Admin cannot deactivate their own active account")
    void updateUserStatus_PreventsSelfDeactivation() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(rootAdmin));
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));

        UpdateUserStatusRequest req = UpdateUserStatusRequest.builder().isActive(false).build();

        assertThatThrownBy(() -> userService.updateUserStatus(1L, req, "admin.root"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Administrators cannot deactivate their own active account");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("User Status - Safeguard prevents deactivating final active administrator")
    void updateUserStatus_PreventsDeactivatingFinalActiveAdmin() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(secondAdmin));
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));
        when(userRepository.countByRoleNameAndIsActiveTrue(RoleName.ROLE_ADMIN)).thenReturn(1L);

        UpdateUserStatusRequest req = UpdateUserStatusRequest.builder().isActive(false).build();

        assertThatThrownBy(() -> userService.updateUserStatus(2L, req, "admin.root"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Cannot deactivate the final remaining active administrator");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("User Status - Admin can deactivate secondary admin when more than one active admin exists")
    void updateUserStatus_AllowsDeactivatingAdmin_WhenMultipleAdminsExist() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(secondAdmin));
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));
        when(userRepository.countByRoleNameAndIsActiveTrue(RoleName.ROLE_ADMIN)).thenReturn(2L);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UpdateUserStatusRequest req = UpdateUserStatusRequest.builder().isActive(false).build();
        UserSummaryDto result = userService.updateUserStatus(2L, req, "admin.root");

        assertThat(result.isActive()).isFalse();
        verify(auditService).logEvent(eq("USER"), eq(2L), eq("USER_DEACTIVATED"), eq(rootAdmin), any(), any());
    }

    @Test
    @DisplayName("User Role - Admin can update user role safely")
    void updateUserRole_Success() {
        when(userRepository.findById(4L)).thenReturn(Optional.of(employee));
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));
        when(roleRepository.findByName(RoleName.ROLE_TECHNICIAN)).thenReturn(Optional.of(techRole));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UpdateUserRoleRequest req = UpdateUserRoleRequest.builder().role("ROLE_TECHNICIAN").build();
        UserSummaryDto result = userService.updateUserRole(4L, req, "admin.root");

        assertThat(result.getRole()).isEqualTo("ROLE_TECHNICIAN");
        verify(auditService).logEvent(eq("USER"), eq(4L), eq("USER_ROLE_UPDATED"), eq(rootAdmin), any(), any());
    }

    @Test
    @DisplayName("User Role - Safeguard prevents demoting the sole active administrator")
    void updateUserRole_PreventsDemotingFinalAdmin() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(rootAdmin));
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));
        when(userRepository.countByRoleNameAndIsActiveTrue(RoleName.ROLE_ADMIN)).thenReturn(1L);

        UpdateUserRoleRequest req = UpdateUserRoleRequest.builder().role("ROLE_EMPLOYEE").build();

        assertThatThrownBy(() -> userService.updateUserRole(1L, req, "admin.root"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Cannot demote the final remaining active administrator");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("User Search - Dynamic query filters users properly")
    void getUsers_WithFilters() {
        Page<User> mockPage = new PageImpl<>(List.of(technician), PageRequest.of(0, 10), 1);
        when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(mockPage);

        PagedResponse<UserSummaryDto> res = userService.getUsers("dave", "ROLE_TECHNICIAN", null, true, PageRequest.of(0, 10));

        assertThat(res.getContent()).hasSize(1);
        assertThat(res.getContent().get(0).getUsername()).isEqualTo("tech.dave");
    }

    // ==========================================
    // 2. Incident Configuration Tests (Category & SLA)
    // ==========================================

    @Test
    @DisplayName("Category - Admin can create a new category and log audit")
    void createCategory_Success() {
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));
        when(categoryRepository.existsByName("Cloud Services")).thenReturn(false);
        when(categoryRepository.save(any(IncidentCategory.class))).thenAnswer(i -> {
            IncidentCategory cat = i.getArgument(0);
            cat.setId(99L);
            return cat;
        });

        CategoryRequest req = CategoryRequest.builder()
                .name("Cloud Services")
                .description("AWS and GCP incidents")
                .slaHours(8)
                .isActive(true)
                .build();

        CategoryDto result = incidentService.createCategory(req, "admin.root");

        assertThat(result.getId()).isEqualTo(99L);
        assertThat(result.getName()).isEqualTo("Cloud Services");
        verify(auditService).logEvent(eq("CATEGORY"), eq(99L), eq("CATEGORY_CREATED"), eq(rootAdmin), isNull(), any());
    }

    @Test
    @DisplayName("Category - Conflict when creating category with duplicate name")
    void createCategory_DuplicateName_ThrowsConflict() {
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));
        when(categoryRepository.existsByName("Network Infrastructure")).thenReturn(true);

        CategoryRequest req = CategoryRequest.builder()
                .name("Network Infrastructure")
                .slaHours(24)
                .build();

        assertThatThrownBy(() -> incidentService.createCategory(req, "admin.root"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already exists");

        verify(categoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Category - Admin can update category and log audit")
    void updateCategory_Success() {
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(categoryRepository.existsByNameAndIdNot("Network Infrastructure Updated", 10L)).thenReturn(false);
        when(categoryRepository.save(any(IncidentCategory.class))).thenAnswer(i -> i.getArgument(0));

        CategoryRequest req = CategoryRequest.builder()
                .name("Network Infrastructure Updated")
                .description("Updated network policy")
                .slaHours(16)
                .isActive(true)
                .build();

        CategoryDto result = incidentService.updateCategory(10L, req, "admin.root");

        assertThat(result.getName()).isEqualTo("Network Infrastructure Updated");
        assertThat(result.getSlaHours()).isEqualTo(16);
        verify(auditService).logEvent(eq("CATEGORY"), eq(10L), eq("CATEGORY_UPDATED"), eq(rootAdmin), any(), any());
    }

    @Test
    @DisplayName("Category - Toggle category active status logs audit")
    void toggleCategoryActive_Success() {
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(categoryRepository.save(any(IncidentCategory.class))).thenAnswer(i -> i.getArgument(0));

        CategoryDto result = incidentService.toggleCategoryActive(10L, "admin.root");

        assertThat(result.isActive()).isFalse();
        verify(auditService).logEvent(eq("CATEGORY"), eq(10L), eq("CATEGORY_DEACTIVATED"), eq(rootAdmin), any(), any());
    }

    @Test
    @DisplayName("SLA Policy - Admin can update SLA policy and log audit")
    void updateSlaPolicy_Success() {
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));
        when(slaPolicyRepository.findByPriority(Priority.CRITICAL)).thenReturn(Optional.of(criticalPolicy));
        when(slaPolicyRepository.save(any(SlaPolicy.class))).thenAnswer(i -> i.getArgument(0));

        UpdateSlaPolicyRequest req = UpdateSlaPolicyRequest.builder()
                .responseTimeHours(2)
                .resolutionTimeHours(6)
                .description("Updated Critical SLA")
                .isActive(true)
                .build();

        SlaPolicyDto result = incidentService.updateSlaPolicy(Priority.CRITICAL, req, "admin.root");

        assertThat(result.getResponseTimeHours()).isEqualTo(2);
        assertThat(result.getResolutionTimeHours()).isEqualTo(6);
        verify(auditService).logEvent(eq("SLA_POLICY"), eq(100L), eq("SLA_POLICY_UPDATED"), eq(rootAdmin), any(), any());
    }

    @Test
    @DisplayName("SLA Policy - Fails validation when resolution time is less than response time")
    void updateSlaPolicy_InvalidTimes_ThrowsIllegalArgument() {
        when(userRepository.findByUsername("admin.root")).thenReturn(Optional.of(rootAdmin));

        UpdateSlaPolicyRequest req = UpdateSlaPolicyRequest.builder()
                .responseTimeHours(10)
                .resolutionTimeHours(4) // Faster than response! Invalid!
                .build();

        assertThatThrownBy(() -> incidentService.updateSlaPolicy(Priority.CRITICAL, req, "admin.root"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot be shorter than response target");

        verify(slaPolicyRepository, never()).save(any());
    }
}
