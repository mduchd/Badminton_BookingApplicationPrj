package com.badmintonbooking.booking.repository;

import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.enums.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    java.util.Optional<Booking> findByCustomerIdAndIdempotencyKey(Long customerId, String idempotencyKey);

    List<Booking> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Booking> findByFacilityIdOrderByCreatedAtDesc(Long facilityId);

    List<Booking> findByFacilityIdInOrderByBookingDateDescStartTimeDesc(Collection<Long> facilityIds);

    List<Booking> findByFacilityIdAndBookingDateBetweenOrderByBookingDateAscStartTimeAsc(
            Long facilityId,
            LocalDate fromDate,
            LocalDate toDate
    );

    boolean existsByCourtId(Long courtId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.status IN :statuses AND b.holdExpiresAt <= :threshold ORDER BY b.id")
    List<Booking> findExpiredHolds(
            @Param("statuses") Collection<BookingStatus> statuses,
            @Param("threshold") OffsetDateTime threshold
    );
}
