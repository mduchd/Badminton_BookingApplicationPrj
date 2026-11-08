package com.badmintonbooking.court.dto;

import java.math.BigDecimal;

public record CourtDto(
        Long id,
        Long facilityId,
        String name,
        Integer courtNumber,
        String courtType,
        BigDecimal basePricePerHour,
        String surfaceType,
        String description,
        String status
) {}
