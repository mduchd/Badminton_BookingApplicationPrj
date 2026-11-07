package com.badmintonbooking.booking.dto;

import com.badmintonbooking.booking.enums.BookingStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

public record BookingResponse(
    Long id,
    Long customerId,
    Long facilityId,
    String facilityName,
    Long courtId,
    String courtName,
    LocalDate bookingDate,
    LocalTime startTime,
    LocalTime endTime,
    BigDecimal totalAmount,
    String currency,
    BookingStatus status,
    OffsetDateTime holdExpiresAt,
    String note,
    OffsetDateTime createdAt,
    String googleCalendarUrl
) {}
