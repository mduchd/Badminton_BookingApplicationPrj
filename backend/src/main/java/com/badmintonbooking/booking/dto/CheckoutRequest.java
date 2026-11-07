package com.badmintonbooking.booking.dto;

public record CheckoutRequest(
    String paymentMethod, // "MOCK" hoặc "PAYOS"
    String returnUrl,
    String cancelUrl
) {
    public String getResolvedPaymentMethod() {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return "PAYOS";
        }
        return paymentMethod.toUpperCase();
    }
}
