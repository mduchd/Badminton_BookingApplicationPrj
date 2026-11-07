package com.badmintonbooking.admin.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record AdminDashboardMetricsResponse(
        long totalUsers,
        long totalCustomers,
        long totalCourtOwners,
        long totalAdmins,
        long totalFacilities,
        long activeFacilities,
        long pendingFacilities,
        long pausedFacilities,
        long totalBookings,
        long confirmedBookings,
        long cancelledBookings,
        BigDecimal totalGmv,
        BigDecimal platformRevenue,
        double platformCommissionPercent,
        List<AdminTransactionDto> recentTransactions,
        Map<String, Long> bookingsByDistrict
) {}
