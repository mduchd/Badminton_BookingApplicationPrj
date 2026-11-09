package com.badmintonbooking.booking.service;

import com.badmintonbooking.booking.dto.BookingCreateRequest;
import com.badmintonbooking.booking.dto.BookingResponse;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.common.exception.SlotConflictException;
import com.badmintonbooking.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
public class BookingIdempotencyService {
    private final BookingService bookings;
    private final BookingRepository repository;
    private final UserRepository users;

    public BookingIdempotencyService(BookingService bookings, BookingRepository repository, UserRepository users) {
        this.bookings = bookings; this.repository = repository; this.users = users;
    }

    @Transactional
    public BookingResponse create(BookingCreateRequest request, Long customerId, String key) {
        if (key == null) return bookings.createHeldBooking(request, customerId);
        if (!key.matches("[A-Za-z0-9_-]{8,128}")) throw new BadRequestException("Mã yêu cầu đặt sân không hợp lệ.");
        users.findByIdForUpdate(customerId).orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản."));
        var existing = repository.findByCustomerIdAndIdempotencyKey(customerId, key);
        if (existing.isPresent()) {
            var booking = existing.get();
            if (!Objects.equals(booking.getCourtId(), request.courtId())
                    || !Objects.equals(booking.getBookingDate(), request.bookingDate())
                    || !Objects.equals(booking.getStartTime(), request.startTime())
                    || !Objects.equals(booking.getEndTime(), request.endTime())
                    || !Objects.equals(booking.getNote(), request.note())) {
                throw new SlotConflictException("Mã yêu cầu đã được dùng cho lựa chọn khác. Vui lòng bắt đầu lại.");
            }
            return bookings.getBookingById(booking.getId(), customerId);
        }
        var response = bookings.createHeldBooking(request, customerId);
        var booking = repository.findById(response.id()).orElseThrow();
        booking.setIdempotencyKey(key);
        repository.save(booking);
        return response;
    }
}
