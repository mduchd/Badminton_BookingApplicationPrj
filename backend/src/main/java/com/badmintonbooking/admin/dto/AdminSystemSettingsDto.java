package com.badmintonbooking.admin.dto;

import java.util.List;

public record AdminSystemSettingsDto(
        double commissionRatePercent,
        int holdMinutes,
        String platformName,
        String supportHotline,
        String supportEmail,
        String broadcastAnnouncement,
        boolean maintenanceMode,
        List<String> systemAmenities
) {}
