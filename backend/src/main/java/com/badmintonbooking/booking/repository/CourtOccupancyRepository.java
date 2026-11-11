package com.badmintonbooking.booking.repository;

import com.badmintonbooking.booking.entity.CourtOccupancy;
import com.badmintonbooking.booking.enums.ActiveStatus;
import com.badmintonbooking.booking.enums.OccupancyType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface CourtOccupancyRepository extends JpaRepository<CourtOccupancy, Long> {
    @Query("SELECT o FROM CourtOccupancy o WHERE o.courtId IN :courtIds AND o.activeStatus = 'ACTIVE' AND o.startAt < :endAt AND o.endAt > :startAt")
    List<CourtOccupancy> findActiveOverlappingBatch(@Param("courtIds") Collection<Long> courtIds,
            @Param("startAt") OffsetDateTime startAt, @Param("endAt") OffsetDateTime endAt);

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

    @Query("SELECT o FROM CourtOccupancy o WHERE o.courtId IN :courtIds " +
           "AND o.occupancyType = :occupancyType " +
           "AND o.activeStatus = :activeStatus " +
           "ORDER BY o.startAt DESC")
    List<CourtOccupancy> findByCourtIdInAndOccupancyTypeAndActiveStatus(
            @Param("courtIds") Collection<Long> courtIds,
            @Param("occupancyType") OccupancyType occupancyType,
            @Param("activeStatus") ActiveStatus activeStatus
    );

    List<CourtOccupancy> findByBookingId(Long bookingId);
}
