package com.badmintonbooking.court.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record PriceRuleUpsertRequest(
        Long courtId, // null = áp dụng toàn bộ cụm sân
        @NotBlank(message = "Tên khung giờ không được để trống")
        String name,
        Integer dayOfWeek, // 0..7
        String dayType, // ALL, WEEKDAY, WEEKEND
        String customerType, // CASUAL, FIXED_MONTHLY
        @NotNull(message = "Giờ bắt đầu không được để trống")
        LocalTime startTime,
        @NotNull(message = "Giờ kết thúc không được để trống")
        LocalTime endTime,
        @NotNull(message = "Đơn giá không được để trống")
        @Positive(message = "Đơn giá phải lớn hơn 0")
        BigDecimal pricePerSlot,
        Integer slotDurationMinutes,
        LocalDate effectiveFrom,
        LocalDate effectiveTo
) {}
