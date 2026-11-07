package com.badmintonbooking.booking;
import com.badmintonbooking.booking.dto.CheckoutRequest;
import com.badmintonbooking.booking.entity.*;
import com.badmintonbooking.booking.enums.*;
import com.badmintonbooking.booking.repository.*;
import com.badmintonbooking.booking.service.*;
import com.badmintonbooking.common.exception.*;
import com.badmintonbooking.court.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.env.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentServiceTest {
    BookingRepository bookings; PaymentRepository payments; PaymentWebhookEventRepository events;
    Environment env; PayOsHelper helper; PaymentService service; Booking booking; Payment payment;
    @BeforeEach void setup() {
        bookings=mock(BookingRepository.class); payments=mock(PaymentRepository.class);
        events=mock(PaymentWebhookEventRepository.class); env=mock(Environment.class); helper=new PayOsHelper();
        service=new PaymentService(bookings,mock(CourtOccupancyRepository.class),payments,events,mock(CourtRepository.class),mock(FacilityRepository.class),mock(ApplicationEventPublisher.class),helper,env);
        ReflectionTestUtils.setField(service,"payOsChecksumKey","test-key");
        ReflectionTestUtils.setField(service,"payOsEnabled",true);
        booking=new Booking(); booking.setId(100L); booking.setCustomerId(1L); booking.setStatus(BookingStatus.PENDING_PAYMENT); booking.setHoldExpiresAt(OffsetDateTime.now().plusMinutes(5));
        payment=new Payment(); payment.setBookingId(100L); payment.setProvider(PaymentProvider.PAYOS); payment.setAmount(new BigDecimal("120000")); payment.setStatus(PaymentStatus.PENDING); payment.setProviderOrderCode(123456L); payment.setTransactionRef("link123");
    }
    Map<String,Object> payload(Map<String,Object> updates) {
        Map<String,Object> data=new TreeMap<>();
        data.put("accountNumber","123"); data.put("amount",120000); data.put("code","00"); data.put("currency","VND"); data.put("description","test"); data.put("orderCode",123456L); data.put("paymentLinkId","link123"); data.put("reference","REF-999"); data.put("counterAccountName",""); data.putAll(updates);
        String signed=data.entrySet().stream().map(e -> e.getKey()+"="+(e.getValue()==null?"":e.getValue())).collect(Collectors.joining("&"));
        return new HashMap<>(Map.of("success",true,"data",data,"signature",helper.calculateHmacSha256(signed,"test-key")));
    }
    @Test void productionMockDisabledEvenIfEnabled() {
        ReflectionTestUtils.setField(service,"mockEnabled",true); when(env.acceptsProfiles(any(Profiles.class))).thenReturn(true);
        assertThrows(BadRequestException.class,()->service.processMockSuccess(100L,10L,1L)); verifyNoInteractions(bookings,payments);
    }
    @Test void otherUserCannotReadOrCreatePayment() {
        when(bookings.findById(100L)).thenReturn(Optional.of(booking));
        assertThrows(ResourceNotFoundException.class,()->service.createCheckout(100L,new CheckoutRequest("PAYOS",null,null),2L));
        assertThrows(ResourceNotFoundException.class,()->service.getPaymentByBookingId(100L,2L)); verifyNoInteractions(payments);
    }
    @Test void missingPayosConfigurationCannotGenerateFallback() {
        booking.setStatus(BookingStatus.HELD); when(bookings.findById(100L)).thenReturn(Optional.of(booking));
        assertThrows(BadRequestException.class,()->service.createCheckout(100L,new CheckoutRequest("PAYOS",null,null),1L)); verifyNoInteractions(payments);
    }
    @Test void rejectsMissingAndForgedSignatures() {
        var body=payload(Map.of()); body.put("signature","wrong");
        assertThrows(BadRequestException.class,()->service.processPayOsWebhook(body));
        assertThrows(BadRequestException.class,()->service.processPayOsWebhook(Map.of()));
        ReflectionTestUtils.setField(service,"payOsChecksumKey","");
        assertThrows(BadRequestException.class,()->service.processPayOsWebhook(payload(Map.of()))); verifyNoInteractions(payments);
    }
    @Test void rejectsTamperedAndMismatchedAmounts() {
        var body=payload(Map.of()); @SuppressWarnings("unchecked") var data=(Map<String,Object>)body.get("data"); data.put("amount",1);
        assertThrows(BadRequestException.class,()->service.processPayOsWebhook(body));
        when(payments.findByProviderOrderCode(123456L)).thenReturn(Optional.of(payment));
        assertThrows(BadRequestException.class,()->service.processPayOsWebhook(payload(Map.of("amount",1)))); verify(payments,never()).save(any());
    }
    @Test void signedDuplicateDoesNotMutate() {
        when(payments.findByProviderOrderCode(123456L)).thenReturn(Optional.of(payment)); when(events.existsByProviderEventKey("PAYOS-123456-REF-999")).thenReturn(true);
        assertTrue(service.processPayOsWebhook(payload(Map.of()))); verify(payments,never()).save(any()); verifyNoInteractions(bookings);
    }
    @Test void latePaymentRecordedForRefund() {
        when(payments.findByProviderOrderCode(123456L)).thenReturn(Optional.of(payment)); when(bookings.findById(100L)).thenReturn(Optional.of(booking)); booking.setHoldExpiresAt(OffsetDateTime.now().minusMinutes(1));
        assertTrue(service.processPayOsWebhook(payload(Map.of()))); assertEquals(PaymentStatus.FAILED,payment.getStatus());
        verify(events).save(argThat(e -> "MANUAL_REFUND_REQUIRED".equals(e.getResult()))); verify(bookings,never()).save(any());
        when(events.existsByProviderEventKey("PAYOS-123456-REF-999")).thenReturn(true);
        assertTrue(service.processPayOsWebhook(payload(Map.of())));
        verify(events, times(1)).save(any());
    }
    @Test void verifiedSuccessfulPaymentConfirmsBooking() {
        when(payments.findByProviderOrderCode(123456L)).thenReturn(Optional.of(payment));
        when(bookings.findById(100L)).thenReturn(Optional.of(booking));
        assertTrue(service.processPayOsWebhook(payload(Map.of())));
        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
        assertEquals(BookingStatus.CONFIRMED, booking.getStatus());
        verify(bookings).save(booking);
    }

    @Test void payosDisabledByDefaultCannotConfirmAnyWebhook() {
        ReflectionTestUtils.setField(service, "payOsEnabled", false);
        assertThrows(BadRequestException.class, () -> service.processPayOsWebhook(payload(Map.of())));
        verifyNoInteractions(payments, bookings);
    }

}
