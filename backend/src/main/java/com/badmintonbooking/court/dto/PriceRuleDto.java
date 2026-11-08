package com.badmintonbooking.court.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record PriceRuleDto(
        Long id,
        Long facilityId,
        Long courtId,
        String courtName,
        String name,
        Integer dayOfWeek,
        String dayType,
        String customerType,
        LocalTime startTime,
        LocalTime endTime,
        BigDecimal pricePerSlot,
        BigDecimal pricePerHour,
        Integer slotDurationMinutes,
        LocalDate effectiveFrom,
        LocalDate effectiveTo
) {}
