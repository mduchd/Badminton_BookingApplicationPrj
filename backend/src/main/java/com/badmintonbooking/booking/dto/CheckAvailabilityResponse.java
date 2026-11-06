package com.badmintonbooking.booking.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CheckAvailabilityResponse(
    Long courtId,
    boolean isAvailable,
    BigDecimal calculatedPrice,
    String reason,
    OffsetDateTime checkedAt
) {}
