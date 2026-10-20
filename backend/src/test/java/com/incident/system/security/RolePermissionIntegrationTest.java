package com.incident.system.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incident.system.dto.LoginRequest;
import com.incident.system.dto.PagedResponse;
import com.incident.system.dto.RegisterRequest;
import com.incident.system.dto.UserSummaryDto;
import com.incident.system.service.AuthService;
import com.incident.system.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RolePermissionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("Unauthenticated Access - GET /api/v1/users/me returns HTTP 401 Unauthorized")
    void testUnauthenticatedAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @WithMockUser(username = "emp.dave", roles = {"EMPLOYEE"})
    @DisplayName("Employee Role - GET /api/v1/users/me returns HTTP 200 for authenticated employee")
    void testEmployeeCanAccessProfile() throws Exception {
        UserSummaryDto userSummary = UserSummaryDto.builder()
                .id(1L)
                .username("emp.dave")
                .email("dave@example.com")
                .fullName("Dave Employee")
                .role("ROLE_EMPLOYEE")
                .isActive(true)
                .createdAt(Instant.now())
                .build();

        when(userService.getCurrentUser("emp.dave")).thenReturn(userSummary);

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("emp.dave"))
                .andExpect(jsonPath("$.data.role").value("ROLE_EMPLOYEE"));
    }

    @Test
    @WithMockUser(username = "emp.dave", roles = {"EMPLOYEE"})
    @DisplayName("Employee Role - GET /api/v1/users returns HTTP 403 Forbidden (restricted to Admin/Technician)")
    void testEmployeeForbiddenFromListingUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    @WithMockUser(username = "tech.carol", roles = {"TECHNICIAN"})
    @DisplayName("Technician Role - GET /api/v1/users returns HTTP 200 OK")
    void testTechnicianCanListUsers() throws Exception {
        PagedResponse<UserSummaryDto> paged = PagedResponse.<UserSummaryDto>builder()
                .content(List.of())
                .page(0)
                .size(10)
                .totalElements(0)
                .totalPages(0)
                .last(true)
                .build();

        when(userService.getAllUsers(any())).thenReturn(paged);

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(username = "emp.dave", roles = {"EMPLOYEE"})
    @DisplayName("Employee Role - POST /api/v1/users/admin returns HTTP 403 Forbidden")
    void testEmployeeForbiddenFromAdminUserCreation() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .username("new.user")
                .email("new@example.com")
                .password("Password123!")
                .fullName("New User")
                .role("ROLE_TECHNICIAN")
                .build();

        mockMvc.perform(post("/api/v1/users/admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @WithMockUser(username = "admin.root", roles = {"ADMIN"})
    @DisplayName("Administrator Role - POST /api/v1/users/admin returns HTTP 201 Created")
    void testAdminCanCreateUserWithRole() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .username("new.tech")
                .email("tech@example.com")
                .password("Password123!")
                .fullName("New Tech")
                .role("ROLE_TECHNICIAN")
                .build();

        UserSummaryDto created = UserSummaryDto.builder()
                .id(99L)
                .username("new.tech")
                .email("tech@example.com")
                .fullName("New Tech")
                .role("ROLE_TECHNICIAN")
                .isActive(true)
                .createdAt(Instant.now())
                .build();

        when(userService.createUserByAdmin(any(RegisterRequest.class))).thenReturn(created);

        mockMvc.perform(post("/api/v1/users/admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.role").value("ROLE_TECHNICIAN"));
    }

    @Test
    @DisplayName("Validation Error Handling - POST /api/v1/auth/login with blank fields returns HTTP 400 Bad Request")
    void testLoginValidationFails() throws Exception {
        LoginRequest invalidRequest = new LoginRequest("", "");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.validationErrors.username").exists())
                .andExpect(jsonPath("$.validationErrors.password").exists());
    }
}
