package com.badmintonbooking.booking.event;

import com.badmintonbooking.booking.websocket.SlotEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class BookingPaymentEventListener {

    private static final Logger log = LoggerFactory.getLogger(BookingPaymentEventListener.class);
    private final SlotEventPublisher slotEventPublisher;

    public BookingPaymentEventListener(SlotEventPublisher slotEventPublisher) {
        this.slotEventPublisher = slotEventPublisher;
    }

    @EventListener
    public void onBookingPaymentConfirmed(BookingPaymentConfirmedEvent event) {
        log.info("Xử lý sự kiện xác nhận thanh toán đặt sân: bookingId={}, court={}", event.bookingId(), event.courtId());
        slotEventPublisher.publishSlotChange(
                event.facilityId(),
                event.courtId(),
                event.bookingDate(),
                event.startTime(),
                event.endTime(),
                "CONFIRMED",
                "Đơn đặt sân #" + event.bookingId() + " đã thanh toán thành công"
        );
    }
}
