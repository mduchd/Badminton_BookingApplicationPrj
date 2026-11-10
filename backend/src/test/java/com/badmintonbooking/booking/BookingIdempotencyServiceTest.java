package com.badmintonbooking.booking;

import com.badmintonbooking.booking.dto.*;
import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.booking.service.*;
import com.badmintonbooking.common.exception.*;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class BookingIdempotencyServiceTest {
    final BookingService bookings = mock(BookingService.class);
    final BookingRepository repository = mock(BookingRepository.class);
    final UserRepository users = mock(UserRepository.class);
    final BookingIdempotencyService service = new BookingIdempotencyService(bookings, repository, users);
    final BookingCreateRequest request = new BookingCreateRequest(2L, LocalDate.of(2027, 1, 1), LocalTime.of(19, 0), LocalTime.of(21, 0), null);

    @Test void repeatedRequestReturnsOriginalBookingWithoutNewHold() {
        when(users.findByIdForUpdate(3L)).thenReturn(Optional.of(new User()));
        var existing = new Booking(); existing.setId(8L); existing.setCourtId(2L);
        existing.setBookingDate(request.bookingDate()); existing.setStartTime(request.startTime()); existing.setEndTime(request.endTime());
        when(repository.findByCustomerIdAndIdempotencyKey(3L, "attempt-123")).thenReturn(Optional.of(existing));
        var response = mock(BookingResponse.class);
        when(bookings.getBookingById(8L, 3L)).thenReturn(response);
        assertSame(response, service.create(request, 3L, "attempt-123"));
        verify(bookings, never()).createHeldBooking(any(), any());
    }

    @Test void reusedKeyWithDifferentCourtIsRejected() {
        when(users.findByIdForUpdate(3L)).thenReturn(Optional.of(new User()));
        var existing = new Booking(); existing.setCourtId(999L);
        when(repository.findByCustomerIdAndIdempotencyKey(3L, "attempt-123")).thenReturn(Optional.of(existing));
        assertThrows(SlotConflictException.class, () -> service.create(request, 3L, "attempt-123"));
        verify(bookings, never()).createHeldBooking(any(), any());
    }

    @Test void invalidKeyIsRejectedBeforeBooking() {
        assertThrows(BadRequestException.class, () -> service.create(request, 3L, "bad"));
        verifyNoInteractions(bookings, repository, users);
    }

    @Test void newKeyIsPersistedOnCreatedBooking() {
        when(users.findByIdForUpdate(3L)).thenReturn(Optional.of(new User()));
        when(repository.findByCustomerIdAndIdempotencyKey(3L, "attempt-123")).thenReturn(Optional.empty());
        var response = mock(BookingResponse.class); when(response.id()).thenReturn(8L);
        when(bookings.createHeldBooking(request, 3L)).thenReturn(response);
        var entity = new Booking(); when(repository.findById(8L)).thenReturn(Optional.of(entity));
        assertSame(response, service.create(request, 3L, "attempt-123"));
        assertEquals("attempt-123", entity.getIdempotencyKey());
        verify(repository).save(entity);
    }
}
