package com.badmintonbooking.court.dto;

import jakarta.validation.constraints.NotBlank;

public record OwnerBookingStatusRequest(
        @NotBlank(message = "Trạng thái cập nhật không được để trống")
        String status // CONFIRMED, COMPLETED, CANCELLED
) {}
