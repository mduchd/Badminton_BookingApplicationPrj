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
        String imageUrl,
        String logoUrl,
        LocalTime openTime,
        LocalTime closeTime,
        String status,
        boolean isApproved,
        int subCourtCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
