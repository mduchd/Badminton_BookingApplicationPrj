package com.badmintonbooking.booking.dto;

import jakarta.validation.constraints.NotNull;

public record MockPayRequest(
    @NotNull(message = "bookingId không được để trống")
    Long bookingId,

    Long orderCode
) {}
