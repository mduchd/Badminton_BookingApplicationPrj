package com.badmintonbooking.booking.controller;

import com.badmintonbooking.booking.dto.BookingCreateRequest;
import com.badmintonbooking.booking.dto.BookingResponse;
import com.badmintonbooking.booking.service.BookingService;
import com.badmintonbooking.common.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import com.badmintonbooking.user.repository.UserRepository;
import com.badmintonbooking.common.exception.ResourceNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final UserRepository userRepository;
    private final com.badmintonbooking.booking.service.BookingIdempotencyService idempotency;

    public BookingController(BookingService bookingService, UserRepository userRepository, com.badmintonbooking.booking.service.BookingIdempotencyService idempotency) {
        this.bookingService = bookingService;
        this.userRepository = userRepository;
        this.idempotency = idempotency;
    }

    private Long customerId(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .filter(user -> "ACTIVE".equalsIgnoreCase(user.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản"))
                .getId();
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> createHeldBooking(
            @Valid @RequestBody BookingCreateRequest request, Authentication authentication,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        BookingResponse response = idempotency.create(request, customerId(authentication), idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Giữ chỗ thành công. Vui lòng kiểm tra thời hạn trong đơn và tiếp tục thanh toán."));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyBookings(
            Authentication authentication
    ) {
        List<BookingResponse> list = bookingService.getMyBookings(customerId(authentication));
        return ResponseEntity.ok(ApiResponse.ok(list, "Lấy danh sách đơn đặt sân thành công"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingById(
            @PathVariable("id") Long id, Authentication authentication
    ) {
        BookingResponse response = bookingService.getBookingById(id, customerId(authentication));
        return ResponseEntity.ok(ApiResponse.ok(response, "Lấy thông tin đơn đặt sân thành công"));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(
            @PathVariable("id") Long id, Authentication authentication
    ) {
        BookingResponse response = bookingService.cancelBooking(id, customerId(authentication));
        return ResponseEntity.ok(ApiResponse.ok(response, "Hủy đơn đặt sân và giải phóng khung giờ thành công"));
    }
}
