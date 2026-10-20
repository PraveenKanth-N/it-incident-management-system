package com.incident.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentRequest {

    @NotBlank(message = "Comment text cannot be blank")
    @Size(max = 5000, message = "Comment text cannot exceed 5000 characters")
    private String commentText;

    private Boolean isInternal;
}
