package com.badmintonbooking.booking.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record CourtAvailabilityResponse(
    Long courtId,
    String courtName,
    Long facilityId,
    String facilityName,
    LocalDate date,
    LocalTime openTime,
    LocalTime closeTime,
    List<TimeSlotDto> slots
) {}
