package com.badmintonbooking.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminFacilityStatusRequest(
        @NotBlank String status, // "ACTIVE", "PAUSED", "SUSPENDED"
        String reason
) {}
