package com.badmintonbooking.booking.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CheckoutResponse(
    Long bookingId,
    Long orderCode,
    BigDecimal amount,
    String paymentMethod,
    String checkoutUrl,
    String qrCode,
    String status,
    OffsetDateTime holdExpiresAt,
    String message
) {}
