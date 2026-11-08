package com.badmintonbooking.court.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CourtUpsertRequest(
        @NotBlank(message = "Tên sân con không được để trống")
        String name,
        Integer courtNumber,
        String courtType, // STANDARD, VIP, TRAINING
        @Positive(message = "Giá cơ bản mỗi giờ phải lớn hơn 0")
        BigDecimal basePricePerHour,
        String surfaceType,
        String description,
        String status // ACTIVE, MAINTENANCE, INACTIVE
) {}
