package com.badmintonbooking.court.dto;

public record UploadedImageDto(
        String url,
        String publicId,
        String provider, // CLOUDINARY or LOCAL_STORAGE
        String fileName,
        long sizeBytes
) {}
