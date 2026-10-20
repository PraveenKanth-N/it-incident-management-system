package com.incident.system.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.incident.system.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDto {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String department;
    private String role;
    
    @JsonProperty("isActive")
    private boolean isActive;
    
    private Instant createdAt;

    public static UserSummaryDto fromEntity(User user) {
        return UserSummaryDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .department(user.getDepartment())
                .role(user.getRole() != null ? user.getRole().getName().name() : null)
                .isActive(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
