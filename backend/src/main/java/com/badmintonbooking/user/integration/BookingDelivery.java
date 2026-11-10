package com.badmintonbooking.user.integration;
import jakarta.persistence.*;
import com.badmintonbooking.booking.enums.BookingStatus;
@Entity @Table(name="booking_deliveries")
public class BookingDelivery {
    @Id @Column(name="booking_id") public Long bookingId;
    @Enumerated(EnumType.STRING) @Column(name="push_status") public BookingStatus pushStatus;
    @Enumerated(EnumType.STRING) @Column(name="calendar_status") public BookingStatus calendarStatus;
    @Column(name="locked_until") public java.time.OffsetDateTime lockedUntil;
    public BookingDelivery() {}
}
