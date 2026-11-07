package com.badmintonbooking.booking.dto;

import java.math.BigDecimal;

public record PayOsWebhookRequest(
    String code,
    String desc,
    Boolean success,
    PayOsWebhookData data,
    String signature
) {
    public record PayOsWebhookData(
        Long orderCode,
        BigDecimal amount,
        String description,
        String accountNumber,
        String reference,
        String transactionDateTime,
        String currency,
        String paymentLinkId,
        String code,
        String desc
    ) {}
}
