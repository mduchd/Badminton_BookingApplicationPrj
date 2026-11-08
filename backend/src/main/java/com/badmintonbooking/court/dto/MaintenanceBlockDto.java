package com.badmintonbooking.court.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

public record MaintenanceBlockDto(
        Long id,
        Long facilityId,
        String facilityName,
        Long courtId,
        String courtName,
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime,
        String reason,
        String activeStatus,
        OffsetDateTime createdAt
) {}
