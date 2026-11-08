package com.badmintonbooking.booking;

import com.badmintonbooking.admin.service.SystemSettingService;
import com.badmintonbooking.booking.dto.BookingCreateRequest;
import com.badmintonbooking.booking.dto.BookingResponse;
import com.badmintonbooking.booking.dto.CheckAvailabilityResponse;
import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.entity.CourtOccupancy;
import com.badmintonbooking.booking.enums.ActiveStatus;
import com.badmintonbooking.booking.enums.BookingStatus;
import com.badmintonbooking.booking.enums.OccupancyType;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.booking.repository.CourtOccupancyRepository;
import com.badmintonbooking.booking.service.AvailabilityService;
import com.badmintonbooking.booking.service.BookingService;
import com.badmintonbooking.booking.websocket.SlotEventPublisher;
import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.common.exception.SlotConflictException;
import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private CourtOccupancyRepository occupancyRepository;

    @Mock
    private CourtRepository courtRepository;

    @Mock
    private FacilityRepository facilityRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AvailabilityService availabilityService;

    @Mock
    private SlotEventPublisher slotEventPublisher;

    @Mock
    private SystemSettingService systemSettingService;

    @InjectMocks
    private BookingService bookingService;

    private Court mockCourt;
    private Facility mockFacility;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(bookingService, "holdDurationMinutes", 10);
        bookingService.setSystemSettingService(systemSettingService);

        mockCourt = new Court();
        mockCourt.setId(1L);
        mockCourt.setFacilityId(10L);
        mockCourt.setName("Sân 1");
        mockCourt.setStatus("ACTIVE");

        mockFacility = new Facility();
        mockFacility.setId(10L);
        mockFacility.setName("Cụm Sân Cầu Giấy");
        mockFacility.setAddress("123 Cầu Giấy");
        mockFacility.setStatus("ACTIVE");
    }

    @Test
    @DisplayName("TC01: Đặt giữ chỗ 10 phút thành công khi khung giờ trống")
    void shouldCreateHeldBookingSuccessfully() {
        LocalDate date = LocalDate.now().plusDays(1);
        LocalTime start = LocalTime.of(8, 0);
        LocalTime end = LocalTime.of(9, 0);

        BookingCreateRequest req = new BookingCreateRequest(1L, date, start, end, "Đặt giao lưu");

        when(courtRepository.findById(1L)).thenReturn(Optional.of(mockCourt));
        when(facilityRepository.findById(10L)).thenReturn(Optional.of(mockFacility));
        when(userRepository.existsById(1L)).thenReturn(true);
        when(availabilityService.checkIntervalAvailability(eq(1L), eq(date), eq(start), eq(end)))
                .thenReturn(new CheckAvailabilityResponse(1L, true, new BigDecimal("120000"), null, OffsetDateTime.now()));

        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            b.setId(100L);
            return b;
        });

        BookingResponse res = bookingService.createHeldBooking(req, 1L);

        assertNotNull(res);
        assertEquals(BookingStatus.HELD, res.status());
        assertEquals(new BigDecimal("120000"), res.totalAmount());
        assertNotNull(res.holdExpiresAt());
        assertNotNull(res.googleCalendarUrl());

        // Kiểm tra đã lưu occupancy HOLD
        verify(occupancyRepository, times(1)).save(any(CourtOccupancy.class));
        // Kiểm tra đã phát STOMP event
        verify(slotEventPublisher, times(1)).publishSlotChange(
                eq(10L), eq(1L), eq(date), eq(start), eq(end), eq("HELD"), anyString()
        );
    }

    @Test
    @DisplayName("TC01: Ném SlotConflictException khi khung giờ đã bị trùng")
    void shouldThrowSlotConflictExceptionWhenIntervalUnavailable() {
        LocalDate date = LocalDate.now().plusDays(1);
        LocalTime start = LocalTime.of(8, 0);
        LocalTime end = LocalTime.of(9, 0);

        BookingCreateRequest req = new BookingCreateRequest(1L, date, start, end, "Giao lưu");

        when(courtRepository.findById(1L)).thenReturn(Optional.of(mockCourt));
        when(facilityRepository.findById(10L)).thenReturn(Optional.of(mockFacility));
        when(userRepository.existsById(1L)).thenReturn(true);
        when(availabilityService.checkIntervalAvailability(eq(1L), eq(date), eq(start), eq(end)))
                .thenReturn(new CheckAvailabilityResponse(1L, false, BigDecimal.ZERO, "Khung giờ đã có người giữ chỗ", OffsetDateTime.now()));

        assertThrows(SlotConflictException.class, () -> bookingService.createHeldBooking(req, 1L));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chặn đặt sân khi Cụm sân đang tạm khóa hoặc chưa phê duyệt")
    void shouldBlockBookingWhenFacilityIsPaused() {
        mockFacility.setStatus("PAUSED");
        LocalDate date = LocalDate.now().plusDays(1);
        BookingCreateRequest req = new BookingCreateRequest(1L, date, LocalTime.of(8, 0), LocalTime.of(9, 0), null);

        when(courtRepository.findById(1L)).thenReturn(Optional.of(mockCourt));
        when(facilityRepository.findById(10L)).thenReturn(Optional.of(mockFacility));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> bookingService.createHeldBooking(req, 1L));
        assertTrue(ex.getMessage().contains("tạm ngưng hoạt động"));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chặn đặt sân khi Sân con đang bảo trì")
    void shouldBlockBookingWhenCourtIsMaintenance() {
        mockCourt.setStatus("MAINTENANCE");
        LocalDate date = LocalDate.now().plusDays(1);
        BookingCreateRequest req = new BookingCreateRequest(1L, date, LocalTime.of(8, 0), LocalTime.of(9, 0), null);

        when(courtRepository.findById(1L)).thenReturn(Optional.of(mockCourt));
        when(facilityRepository.findById(10L)).thenReturn(Optional.of(mockFacility));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> bookingService.createHeldBooking(req, 1L));
        assertTrue(ex.getMessage().contains("bảo trì hoặc tạm ngưng hoạt động"));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chặn đặt sân khi hệ thống đang trong chế độ bảo trì")
    void shouldBlockBookingWhenSystemUnderMaintenance() {
        when(systemSettingService.isMaintenanceMode()).thenReturn(true);
        LocalDate date = LocalDate.now().plusDays(1);
        BookingCreateRequest req = new BookingCreateRequest(1L, date, LocalTime.of(8, 0), LocalTime.of(9, 0), null);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> bookingService.createHeldBooking(req, 1L));
        assertTrue(ex.getMessage().contains("chế độ bảo trì"));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Booking: Hủy đơn thành công và giải phóng CourtOccupancy")
    void shouldCancelBookingAndReleaseOccupancy() {
        Booking booking = new Booking();
        booking.setId(100L);
        booking.setCustomerId(1L);
        booking.setCourtId(1L);
        booking.setFacilityId(10L);
        booking.setBookingDate(LocalDate.now().plusDays(1));
        booking.setStartTime(LocalTime.of(8, 0));
        booking.setEndTime(LocalTime.of(9, 0));
        booking.setStatus(BookingStatus.HELD);

        CourtOccupancy occ = new CourtOccupancy(1L, 100L, OffsetDateTime.now(), OffsetDateTime.now().plusHours(1), OccupancyType.HOLD);

        when(bookingRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(booking));
        when(occupancyRepository.findByBookingId(100L)).thenReturn(List.of(occ));
        when(courtRepository.findById(1L)).thenReturn(Optional.of(mockCourt));
        when(facilityRepository.findById(10L)).thenReturn(Optional.of(mockFacility));

        BookingResponse res = bookingService.cancelBooking(100L, 1L);

        assertEquals(BookingStatus.CANCELLED, res.status());
        assertEquals(ActiveStatus.RELEASED, occ.getActiveStatus());
        verify(slotEventPublisher, times(1)).publishSlotChange(
                eq(10L), eq(1L), any(), any(), any(), eq("RELEASED"), anyString()
        );
    }
}
