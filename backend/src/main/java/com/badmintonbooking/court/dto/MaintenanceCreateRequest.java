package com.badmintonbooking.court.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record MaintenanceCreateRequest(
        Long courtId, // null hoặc 0 nếu khóa toàn bộ các sân con trong cụm sân
        Boolean applyAllCourts,
        @NotNull(message = "Ngày bảo trì không được để trống")
        LocalDate date,
        @NotNull(message = "Giờ bắt đầu không được để trống")
        LocalTime startTime,
        @NotNull(message = "Giờ kết thúc không được để trống")
        LocalTime endTime,
        @NotBlank(message = "Vui lòng nhập lý do bảo trì")
        String reason
) {}
