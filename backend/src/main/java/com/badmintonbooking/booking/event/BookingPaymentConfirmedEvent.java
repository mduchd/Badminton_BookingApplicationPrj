package com.badmintonbooking.booking.event;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record BookingPaymentConfirmedEvent(
    Long bookingId,
    Long customerId,
    Long courtId,
    String courtName,
    Long facilityId,
    String facilityName,
    LocalDate bookingDate,
    LocalTime startTime,
    LocalTime endTime,
    BigDecimal totalAmount,
    Long orderCode,
    String paymentMethod
) {}
