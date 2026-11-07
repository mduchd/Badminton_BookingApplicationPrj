package com.badmintonbooking.admin.dto;

import java.time.OffsetDateTime;

public record AdminUserDto(
        Long id,
        String fullName,
        String email,
        String phone,
        String role,
        String status,
        String provider,
        OffsetDateTime createdAt
) {}
