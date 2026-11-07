package com.badmintonbooking.booking.websocket;

import java.time.LocalDate;
import java.time.LocalTime;

public record SlotStatusEvent(
    Long facilityId,
    Long courtId,
    LocalDate bookingDate,
    LocalTime startTime,
    LocalTime endTime,
    String eventType, // HELD, RELEASED, CONFIRMED
    String message
) {}
