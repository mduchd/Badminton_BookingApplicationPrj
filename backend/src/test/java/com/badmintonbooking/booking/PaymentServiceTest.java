package com.badmintonbooking.booking;

import com.badmintonbooking.booking.dto.CheckoutResponse;
import com.badmintonbooking.booking.dto.PayOsWebhookRequest;
import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.entity.CourtOccupancy;
import com.badmintonbooking.booking.entity.Payment;
import com.badmintonbooking.booking.entity.PaymentWebhookEvent;
import com.badmintonbooking.booking.enums.ActiveStatus;
import com.badmintonbooking.booking.enums.BookingStatus;
import com.badmintonbooking.booking.enums.OccupancyType;
import com.badmintonbooking.booking.enums.PaymentStatus;
import com.badmintonbooking.booking.event.BookingPaymentConfirmedEvent;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.booking.repository.CourtOccupancyRepository;
import com.badmintonbooking.booking.repository.PaymentRepository;
import com.badmintonbooking.booking.repository.PaymentWebhookEventRepository;
import com.badmintonbooking.booking.service.PayOsHelper;
import com.badmintonbooking.booking.service.PaymentService;
import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
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
class PaymentServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private CourtOccupancyRepository occupancyRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentWebhookEventRepository webhookEventRepository;

    @Mock
    private CourtRepository courtRepository;

    @Mock
    private FacilityRepository facilityRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private PayOsHelper payOsHelper;

    @InjectMocks
    private PaymentService paymentService;

    private Booking mockBooking;
    private Court mockCourt;
    private Facility mockFacility;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "payOsChecksumKey", "test_checksum_key");

        mockBooking = new Booking();
        mockBooking.setId(100L);
        mockBooking.setCustomerId(1L);
        mockBooking.setCourtId(1L);
        mockBooking.setFacilityId(10L);
        mockBooking.setBookingDate(LocalDate.now().plusDays(1));
        mockBooking.setStartTime(LocalTime.of(8, 0));
        mockBooking.setEndTime(LocalTime.of(9, 0));
        mockBooking.setTotalAmount(new BigDecimal("120000"));
        mockBooking.setStatus(BookingStatus.HELD);
        mockBooking.setHoldExpiresAt(OffsetDateTime.now().plusMinutes(10));

        mockCourt = new Court();
        mockCourt.setId(1L);
        mockCourt.setName("Sân 1");

        mockFacility = new Facility();
        mockFacility.setId(10L);
        mockFacility.setName("Cụm Sân Cầu Giấy");
    }

    @Test
    @DisplayName("Payment: Xác nhận thanh toán Mock thành công và phát sự kiện nội bộ")
    void shouldProcessMockSuccessCorrectly() {
        CourtOccupancy occ = new CourtOccupancy(1L, 100L, OffsetDateTime.now(), OffsetDateTime.now().plusHours(1), OccupancyType.HOLD);

        when(bookingRepository.findById(100L)).thenReturn(Optional.of(mockBooking));
        when(paymentRepository.findByBookingId(100L)).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));
        when(occupancyRepository.findByBookingId(100L)).thenReturn(List.of(occ));
        when(courtRepository.findById(1L)).thenReturn(Optional.of(mockCourt));
        when(facilityRepository.findById(10L)).thenReturn(Optional.of(mockFacility));

        CheckoutResponse res = paymentService.processMockSuccess(100L, 99999L);

        assertNotNull(res);
        assertEquals("CONFIRMED", res.status());
        assertEquals(BookingStatus.CONFIRMED, mockBooking.getStatus());
        assertEquals(OccupancyType.BOOKING, occ.getOccupancyType());
        assertEquals(ActiveStatus.ACTIVE, occ.getActiveStatus());

        verify(eventPublisher, times(1)).publishEvent(any(BookingPaymentConfirmedEvent.class));
    }

    @Test
    @DisplayName("TC04: Idempotency - Webhook trùng lặp (duplicate) không được ghi đè hay xử lý lại")
    void shouldHandleDuplicateWebhookIdempotently() {
        PayOsWebhookRequest.PayOsWebhookData data = new PayOsWebhookRequest.PayOsWebhookData(
                123456L, new BigDecimal("120000"), "Thanh toan san SmashCourt #100", "0987654321", "REF-999", "2026-11-20 18:00:00", "VND", "link123", "00", "Thanh cong"
        );
        PayOsWebhookRequest payload = new PayOsWebhookRequest("00", "Success", true, data, "valid_signature");

        when(payOsHelper.calculateHmacSha256(anyString(), anyString())).thenReturn("valid_signature");
        String eventKey = "PAYOS-123456-REF-999";
        when(webhookEventRepository.existsByProviderEventKey(eventKey)).thenReturn(true);

        boolean result = paymentService.processPayOsWebhook(payload);

        assertTrue(result);
        verify(paymentRepository, never()).save(any());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("TC05: Webhook thanh toán đến sau khi đơn đã hết hạn -> Ghi nhận MANUAL_REFUND_REQUIRED")
    void shouldFlagManualRefundWhenHoldExpired() {
        PayOsWebhookRequest.PayOsWebhookData data = new PayOsWebhookRequest.PayOsWebhookData(
                123456L, new BigDecimal("120000"), "Thanh toan san SmashCourt #100", "0987654321", "REF-999", "2026-11-20 18:00:00", "VND", "link123", "00", "Thanh cong"
        );
        PayOsWebhookRequest payload = new PayOsWebhookRequest("00", "Success", true, data, "valid_signature");

        when(webhookEventRepository.existsByProviderEventKey(anyString())).thenReturn(false);
        when(payOsHelper.calculateHmacSha256(anyString(), anyString())).thenReturn("valid_signature");

        Payment payment = new Payment();
        payment.setBookingId(100L);
        payment.setStatus(PaymentStatus.PENDING);
        when(paymentRepository.findByProviderOrderCode(123456L)).thenReturn(Optional.of(payment));

        // Đơn đã EXPIRED
        mockBooking.setStatus(BookingStatus.EXPIRED);
        when(bookingRepository.findById(100L)).thenReturn(Optional.of(mockBooking));

        boolean result = paymentService.processPayOsWebhook(payload);

        assertTrue(result);
        assertEquals(PaymentStatus.FAILED, payment.getStatus());
        verify(webhookEventRepository, times(1)).save(argThat(event -> "MANUAL_REFUND_REQUIRED".equals(event.getResult())));
        verify(bookingRepository, never()).save(argThat(b -> b.getStatus() == BookingStatus.CONFIRMED));
    }
}
