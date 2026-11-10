package com.badmintonbooking.booking.controller;

import com.badmintonbooking.booking.dto.CheckoutRequest;
import com.badmintonbooking.booking.dto.CheckoutResponse;
import com.badmintonbooking.booking.dto.MockPayRequest;
import com.badmintonbooking.booking.entity.Payment;
import com.badmintonbooking.booking.service.PaymentService;
import com.badmintonbooking.common.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import com.badmintonbooking.user.repository.UserRepository;
import com.badmintonbooking.common.exception.ResourceNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    public PaymentController(PaymentService paymentService, UserRepository userRepository) {
        this.paymentService = paymentService;
        this.userRepository = userRepository;
    }

    private Long currentUserId(Authentication authentication) {
        if (authentication == null) throw new ResourceNotFoundException("Không tìm thấy tài khoản");
        return userRepository.findByEmail(authentication.getName())
            .filter(user -> "ACTIVE".equalsIgnoreCase(user.getStatus()))
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản")).getId();
    }

    /**
     * Khởi tạo phiên thanh toán cho đơn đặt sân (hỗ trợ MOCK hoặc PAYOS)
     */
    @PostMapping("/bookings/{id}/checkout")
    public ResponseEntity<ApiResponse<CheckoutResponse>> checkout(
            @PathVariable("id") Long bookingId,
            @RequestBody(required = false) CheckoutRequest request, Authentication authentication
    ) {
        CheckoutRequest req = request != null ? request : new CheckoutRequest("PAYOS", null, null);
        CheckoutResponse response = paymentService.createCheckout(bookingId, req, currentUserId(authentication));
        return ResponseEntity.ok(ApiResponse.ok(response, "Khởi tạo thanh toán thành công"));
    }

    /**
     * Giả lập thanh toán thành công ngay ở Local / Test mà không cần tài khoản ngân hàng
     */
    @PostMapping("/payments/mock-success")
    public ResponseEntity<ApiResponse<CheckoutResponse>> mockPay(
            @Valid @RequestBody MockPayRequest request, Authentication authentication
    ) {
        CheckoutResponse response = paymentService.processMockSuccess(request.bookingId(), request.orderCode(), currentUserId(authentication));
        return ResponseEntity.ok(ApiResponse.ok(response, "Thanh toán giả lập thành công"));
    }

    /**
     * Nhận và xác thực Webhook tự động từ payOS (với HMAC-SHA256 và Idempotency)
     */
    @PostMapping("/webhooks/payos/confirm")
    public ResponseEntity<Map<String, Object>> confirmPayOsWebhook() {
        boolean ok = paymentService.confirmPayOsWebhook();
        return ResponseEntity.ok(Map.of(
                "success", ok,
                "message", ok ? "Đăng ký Webhook URL với payOS thành công." : "Đăng ký Webhook với payOS thất bại."
        ));
    }

    @PostMapping("/webhooks/payos")
    public ResponseEntity<Map<String, Object>> payOsWebhook(
            @RequestBody Map<String, Object> payload
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
            @PathVariable("bookingId") Long bookingId, Authentication authentication
    ) {
        Payment payment = paymentService.getPaymentByBookingId(bookingId, currentUserId(authentication));
        return ResponseEntity.ok(ApiResponse.ok(payment, "Lấy thông tin thanh toán thành công"));
    }
}
