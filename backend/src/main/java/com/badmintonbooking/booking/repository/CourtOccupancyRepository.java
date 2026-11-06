package com.badmintonbooking.booking.repository;

import com.badmintonbooking.booking.entity.CourtOccupancy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CourtOccupancyRepository extends JpaRepository<CourtOccupancy, Long> {

    @Query("SELECT o FROM CourtOccupancy o WHERE o.courtId = :courtId " +
           "AND o.activeStatus = 'ACTIVE' " +
           "AND o.startAt < :endAt AND o.endAt > :startAt")
    List<CourtOccupancy> findActiveOverlapping(
            @Param("courtId") Long courtId,
            @Param("startAt") OffsetDateTime startAt,
            @Param("endAt") OffsetDateTime endAt
    );

    @Query("SELECT o FROM CourtOccupancy o WHERE o.courtId = :courtId " +
           "AND o.activeStatus = 'ACTIVE' " +
           "AND o.startAt < :endOfDay AND o.endAt > :startOfDay " +
           "ORDER BY o.startAt ASC")
    List<CourtOccupancy> findActiveForCourtInDateRange(
            @Param("courtId") Long courtId,
            @Param("startOfDay") OffsetDateTime startOfDay,
            @Param("endOfDay") OffsetDateTime endOfDay
    );

    Optional<CourtOccupancy> findByBookingIdAndActiveStatus(Long bookingId, com.badmintonbooking.booking.enums.ActiveStatus activeStatus);

    List<CourtOccupancy> findByBookingId(Long bookingId);
}
