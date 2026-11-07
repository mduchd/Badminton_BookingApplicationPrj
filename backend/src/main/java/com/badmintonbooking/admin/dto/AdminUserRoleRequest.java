package com.badmintonbooking.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminUserRoleRequest(
        @NotBlank String role
) {}
