package com.badmintonbooking.user.integration;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface BookingDeliveryRepository extends JpaRepository<BookingDelivery,Long> {
    @Query("SELECT b.id FROM Booking b JOIN User u ON u.id=b.customerId LEFT JOIN BookingDelivery d ON d.bookingId=b.id " +
        "WHERE u.status='ACTIVE' AND b.bookingDate>=:today AND b.status IN (com.badmintonbooking.booking.enums.BookingStatus.CONFIRMED, com.badmintonbooking.booking.enums.BookingStatus.CANCELLED, com.badmintonbooking.booking.enums.BookingStatus.COMPLETED) " +
        "AND (d.lockedUntil IS NULL OR d.lockedUntil<:now) AND ((u.fcmEnabled=true AND (d.pushStatus IS NULL OR d.pushStatus<>b.status)) " +
        "OR (u.calendarConnected=true AND (d.calendarStatus IS NULL OR d.calendarStatus<>b.status))) ORDER BY b.updatedAt")
    java.util.List<Long> candidates(@Param("today") java.time.LocalDate today, @Param("now") java.time.OffsetDateTime now, org.springframework.data.domain.Pageable page);
    @Modifying @Query("UPDATE BookingDelivery d SET d.calendarStatus=null WHERE d.bookingId IN (SELECT b.id FROM Booking b WHERE b.customerId=:userId)")
    void resetCalendar(@Param("userId") Long userId);
    @Modifying @Query("UPDATE BookingDelivery d SET d.pushStatus=null WHERE d.bookingId IN (SELECT b.id FROM Booking b WHERE b.customerId=:userId)")
    void resetPush(@Param("userId") Long userId);
}
