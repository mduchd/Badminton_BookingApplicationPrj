package com.badmintonbooking.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminUserStatusRequest(
        @NotBlank String status,
        String reason
) {}
