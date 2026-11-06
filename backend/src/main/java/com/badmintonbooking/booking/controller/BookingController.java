package com.badmintonbooking.booking.controller;

import com.badmintonbooking.booking.dto.BookingCreateRequest;
import com.badmintonbooking.booking.dto.BookingResponse;
import com.badmintonbooking.booking.service.BookingService;
import com.badmintonbooking.common.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> createHeldBooking(
            @Valid @RequestBody BookingCreateRequest request
    ) {
        BookingResponse response = bookingService.createHeldBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Giữ chỗ thành công! Đơn của bạn được giữ trong 10 phút để thanh toán."));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyBookings(
            @RequestParam(value = "customerId", defaultValue = "1") Long customerId
    ) {
        List<BookingResponse> list = bookingService.getMyBookings(customerId);
        return ResponseEntity.ok(ApiResponse.ok(list, "Lấy danh sách đơn đặt sân thành công"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingById(
            @PathVariable("id") Long id
    ) {
        BookingResponse response = bookingService.getBookingById(id);
        return ResponseEntity.ok(ApiResponse.ok(response, "Lấy thông tin đơn đặt sân thành công"));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(
            @PathVariable("id") Long id,
            @RequestParam(value = "customerId", required = false) Long customerId
    ) {
        BookingResponse response = bookingService.cancelBooking(id, customerId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Hủy đơn đặt sân và giải phóng khung giờ thành công"));
    }
}
