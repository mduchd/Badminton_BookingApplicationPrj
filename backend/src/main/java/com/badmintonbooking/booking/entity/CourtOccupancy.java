package com.badmintonbooking.booking.entity;

import com.badmintonbooking.booking.enums.ActiveStatus;
import com.badmintonbooking.booking.enums.OccupancyType;
import com.badmintonbooking.court.entity.Court;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "court_occupancies")
public class CourtOccupancy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "court_id", nullable = false)
    private Long courtId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "court_id", insertable = false, updatable = false)
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private Court court;

    @Column(name = "booking_id")
    private Long bookingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", insertable = false, updatable = false)
    private Booking booking;

    @Column(name = "start_at", nullable = false)
    private OffsetDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private OffsetDateTime endAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "occupancy_type", nullable = false)
    private OccupancyType occupancyType = OccupancyType.HOLD;

    @Enumerated(EnumType.STRING)
    @Column(name = "active_status", nullable = false)
    private ActiveStatus activeStatus = ActiveStatus.ACTIVE;

    @Column(length = 500)
    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public CourtOccupancy() {}

    public CourtOccupancy(Long courtId, Long bookingId, OffsetDateTime startAt, OffsetDateTime endAt, OccupancyType occupancyType) {
        this.courtId = courtId;
        this.bookingId = bookingId;
        this.startAt = startAt;
        this.endAt = endAt;
        this.occupancyType = occupancyType;
        this.activeStatus = ActiveStatus.ACTIVE;
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCourtId() { return courtId; }
    public void setCourtId(Long courtId) { this.courtId = courtId; }

    public Court getCourt() { return court; }
    public void setCourt(Court court) { this.court = court; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }

    public OffsetDateTime getStartAt() { return startAt; }
    public void setStartAt(OffsetDateTime startAt) { this.startAt = startAt; }

    public OffsetDateTime getEndAt() { return endAt; }
    public void setEndAt(OffsetDateTime endAt) { this.endAt = endAt; }

    public OccupancyType getOccupancyType() { return occupancyType; }
    public void setOccupancyType(OccupancyType occupancyType) { this.occupancyType = occupancyType; }

    public ActiveStatus getActiveStatus() { return activeStatus; }
    public void setActiveStatus(ActiveStatus activeStatus) { this.activeStatus = activeStatus; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
