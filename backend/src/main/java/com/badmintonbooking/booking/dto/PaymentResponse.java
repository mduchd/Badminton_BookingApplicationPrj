package com.badmintonbooking.booking.dto;

import com.badmintonbooking.booking.entity.Payment;
import com.badmintonbooking.booking.enums.PaymentProvider;
import com.badmintonbooking.booking.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PaymentResponse(
        Long id,
        Long bookingId,
        PaymentProvider provider,
        Long providerOrderCode,
        BigDecimal amount,
        PaymentStatus status,
        String transactionRef,
        String qrCode,
        Double commissionRate,
        BigDecimal commissionAmount,
        OffsetDateTime paidAt,
        OffsetDateTime createdAt
) {
    public static PaymentResponse from(Payment payment) {
        if (payment == null) return null;
        return new PaymentResponse(
                payment.getId(),
                payment.getBookingId(),
                payment.getProvider(),
                payment.getProviderOrderCode(),
                payment.getAmount(),
                payment.getStatus(),
                payment.getTransactionRef(),
                payment.getQrCode(),
                payment.getCommissionRate(),
                payment.getCommissionAmount(),
                payment.getPaidAt(),
                payment.getCreatedAt()
        );
    }
}
