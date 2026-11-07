package com.badmintonbooking.booking.controller;

import com.badmintonbooking.booking.dto.CheckoutRequest;
import com.badmintonbooking.booking.dto.CheckoutResponse;
import com.badmintonbooking.booking.dto.MockPayRequest;
import com.badmintonbooking.booking.dto.PayOsWebhookRequest;
import com.badmintonbooking.booking.entity.Payment;
import com.badmintonbooking.booking.service.PaymentService;
import com.badmintonbooking.common.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Khởi tạo phiên thanh toán cho đơn đặt sân (hỗ trợ MOCK hoặc PAYOS)
     */
    @PostMapping("/bookings/{id}/checkout")
    public ResponseEntity<ApiResponse<CheckoutResponse>> checkout(
            @PathVariable("id") Long bookingId,
            @RequestBody(required = false) CheckoutRequest request
    ) {
        CheckoutRequest req = request != null ? request : new CheckoutRequest("MOCK", null, null);
        CheckoutResponse response = paymentService.createCheckout(bookingId, req);
        return ResponseEntity.ok(ApiResponse.ok(response, "Khởi tạo thanh toán thành công"));
    }

    /**
     * Giả lập thanh toán thành công ngay ở Local / Test mà không cần tài khoản ngân hàng
     */
    @PostMapping("/payments/mock-success")
    public ResponseEntity<ApiResponse<CheckoutResponse>> mockPay(
            @Valid @RequestBody MockPayRequest request
    ) {
        CheckoutResponse response = paymentService.processMockSuccess(request.bookingId(), request.orderCode());
        return ResponseEntity.ok(ApiResponse.ok(response, "Thanh toán giả lập thành công"));
    }

    /**
     * Nhận và xác thực Webhook tự động từ payOS (với HMAC-SHA256 và Idempotency)
     */
    @PostMapping("/webhooks/payos")
    public ResponseEntity<Map<String, Object>> payOsWebhook(
            @RequestBody PayOsWebhookRequest payload
    ) {
        boolean processed = paymentService.processPayOsWebhook(payload);
        return ResponseEntity.ok(Map.of(
                "success", processed,
                "message", "Webhook payOS đã được tiếp nhận và xử lý thành công."
        ));
    }

    /**
     * Lấy thông tin thanh toán theo mã booking
     */
    @GetMapping("/payments/booking/{bookingId}")
    public ResponseEntity<ApiResponse<Payment>> getPaymentByBooking(
            @PathVariable("bookingId") Long bookingId
    ) {
        Payment payment = paymentService.getPaymentByBookingId(bookingId);
        return ResponseEntity.ok(ApiResponse.ok(payment, "Lấy thông tin thanh toán thành công"));
    }
}
