package com.badmintonbooking.admin.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AdminTransactionDto(
        Long id,
        Long bookingId,
        Long orderCode,
        String customerName,
        String customerPhone,
        String facilityName,
        String provider,
        BigDecimal amount,
        BigDecimal platformFee,
        String status,
        String transactionRef,
        OffsetDateTime createdAt,
        OffsetDateTime paidAt
) {}
