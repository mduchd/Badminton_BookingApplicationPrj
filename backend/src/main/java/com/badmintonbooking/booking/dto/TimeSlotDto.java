package com.badmintonbooking.booking.dto;

import java.math.BigDecimal;
import java.time.LocalTime;

public record TimeSlotDto(
    LocalTime startTime,
    LocalTime endTime,
    BigDecimal price,
    boolean available,
    String slotStatus, // AVAILABLE, HELD, BOOKED, MAINTENANCE
    String reason
) {}
