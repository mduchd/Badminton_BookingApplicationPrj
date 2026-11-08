package com.badmintonbooking.court.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalTime;
import java.util.List;

public record FacilityUpsertRequest(
        @NotBlank(message = "Tên cụm sân không được để trống")
        String name,
        String city,
        @NotBlank(message = "Quận / Huyện không được để trống")
        String district,
        String ward,
        String streetAddress,
        String address,
        Double latitude,
        Double longitude,
        LocalTime openTime,
        LocalTime closeTime,
        String phone,
        String messengerUrl,
        String description,
        String logoUrl,
        String imageUrl,
        List<String> galleryImages,
        List<String> amenities,
        String sportType,
        String status,
        List<CourtUpsertRequest> courts
) {}
