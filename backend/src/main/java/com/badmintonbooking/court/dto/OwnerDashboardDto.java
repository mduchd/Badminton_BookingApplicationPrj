package com.badmintonbooking.court.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record OwnerDashboardDto(
        Long facilityId,
        String facilityName,
        LocalDate fromDate,
        LocalDate toDate,
        BigDecimal totalRevenue,
        BigDecimal todayRevenue,
        int confirmedBookingsCount,
        int completedBookingsCount,
        int heldBookingsCount,
        int cancelledBookingsCount,
        double occupancyRatePercent,
        int activeCourtsCount,
        int maintenanceCourtsCount,
        int totalCourtsCount,
        List<DailyRevenuePoint> dailyRevenue,
        List<CourtRevenueItem> courtRevenues,
        List<HourlyBandOccupancy> hourlyBands,
        List<LiveCourtStatusItem> liveCourts,
        List<OwnerBookingItemDto> todayCheckInQueue
) {
    public record DailyRevenuePoint(
            LocalDate date,
            String label,
            BigDecimal revenue,
            int bookingCount
    ) {}

    public record CourtRevenueItem(
            Long courtId,
            String courtName,
            String courtType,
            String status,
            BigDecimal revenue,
            int bookingCount,
            double bookedHours
    ) {}

    public record HourlyBandOccupancy(
            String bandLabel,
            double occupancyPercent,
            int bookingCount
    ) {}

    public record LiveCourtStatusItem(
            Long courtId,
            String courtName,
            String courtType,
            String currentStatus, // AVAILABLE, PLAYING, HELD, MAINTENANCE
            String currentSlotInfo
    ) {}
}
