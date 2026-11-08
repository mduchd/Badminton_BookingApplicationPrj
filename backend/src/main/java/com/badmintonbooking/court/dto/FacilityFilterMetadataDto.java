package com.badmintonbooking.court.dto;

import java.util.List;

public record FacilityFilterMetadataDto(
        List<String> cities,
        List<String> districts,
        List<String> amenities
) {}
