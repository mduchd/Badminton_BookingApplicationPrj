package com.badmintonbooking.admin.dto;

import java.time.LocalTime;
import java.time.OffsetDateTime;

public record AdminFacilityDto(
        Long id,
        Long ownerId,
        String ownerName,
        String ownerEmail,
        String ownerPhone,
        String name,
        String city,
        String district,
        String ward,
        String address,
        LocalTime openTime,
        LocalTime closeTime,
        String status,
        boolean isApproved,
        int subCourtCount,
        String rejectionReason,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
