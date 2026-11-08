package com.badmintonbooking.court.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

public record OwnerBookingItemDto(
        Long id,
        String bookingCode,
        Long facilityId,
        String facilityName,
        Long courtId,
        String courtName,
        Long customerId,
        String customerName,
        String customerPhone,
        String customerEmail,
        LocalDate bookingDate,
        LocalTime startTime,
        LocalTime endTime,
        BigDecimal totalAmount,
        String currency,
        String status,
        String note,
        OffsetDateTime holdExpiresAt,
        OffsetDateTime createdAt
) {}
