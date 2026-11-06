package com.badmintonbooking.booking.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "booking_calendar_links")
public class BookingCalendarLink {

    @Id
    @Column(name = "booking_id")
    private Long bookingId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", insertable = false, updatable = false)
    private Booking booking;

    @Column(name = "google_event_id")
    private String googleEventId;

    @Column(name = "sync_status", nullable = false)
    private String syncStatus = "PENDING";

    @Column(name = "last_synced_at")
    private OffsetDateTime lastSyncedAt;

    public BookingCalendarLink() {}

    public BookingCalendarLink(Long bookingId, String googleEventId, String syncStatus) {
        this.bookingId = bookingId;
        this.googleEventId = googleEventId;
        this.syncStatus = syncStatus;
        this.lastSyncedAt = OffsetDateTime.now();
    }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }

    public String getGoogleEventId() { return googleEventId; }
    public void setGoogleEventId(String googleEventId) { this.googleEventId = googleEventId; }

    public String getSyncStatus() { return syncStatus; }
    public void setSyncStatus(String syncStatus) { this.syncStatus = syncStatus; }

    public OffsetDateTime getLastSyncedAt() { return lastSyncedAt; }
    public void setLastSyncedAt(OffsetDateTime lastSyncedAt) { this.lastSyncedAt = lastSyncedAt; }
}
