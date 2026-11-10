package com.badmintonbooking.court.dto;

import jakarta.validation.constraints.NotBlank;

public record OwnerBookingStatusRequest(
        @NotBlank(message = "Trạng thái cập nhật không được để trống")
        String status // COMPLETED, CANCELLED; confirmation is handled by the payment webhook
) {}
