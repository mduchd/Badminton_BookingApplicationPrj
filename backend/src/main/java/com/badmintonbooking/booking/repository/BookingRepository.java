package com.badmintonbooking.booking.repository;

import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Booking> findByFacilityIdOrderByCreatedAtDesc(Long facilityId);

    List<Booking> findByCourtIdAndBookingDate(Long courtId, LocalDate bookingDate);

    @Query("SELECT b FROM Booking b WHERE b.status IN :statuses AND b.holdExpiresAt < :threshold")
    List<Booking> findExpiredHolds(
            @Param("statuses") Collection<BookingStatus> statuses,
            @Param("threshold") OffsetDateTime threshold
    );
}
