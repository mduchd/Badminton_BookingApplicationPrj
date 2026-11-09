package com.badmintonbooking.court.dto;

import com.badmintonbooking.court.entity.Facility;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

/** Public catalog fields used by the list. Booking and detail data have separate endpoints. */
public record FacilityCardDto(Long id, String name, String slug, String city, String district, String ward,
        String streetAddress, String address, String normalizedAddress, Double latitude, Double longitude,
        LocalTime openTime, LocalTime closeTime, String logoUrl, String imageUrl, String sportType,
        BigDecimal rating, Integer reviewCount, BigDecimal minPrice, BigDecimal maxPrice, List<String> amenities) {
    public static FacilityCardDto from(Facility facility, String cover) {
        return new FacilityCardDto(facility.getId(), facility.getName(), facility.getSlug(), facility.getCity(),
                facility.getDistrict(), facility.getWard(), facility.getStreetAddress(), facility.getAddress(),
                facility.getNormalizedAddress(), facility.getLatitude(), facility.getLongitude(), facility.getOpenTime(),
                facility.getCloseTime(), facility.getLogoUrl(), cover, facility.getSportType(), facility.getRating(),
                facility.getReviewCount(), facility.getMinPrice(), facility.getMaxPrice(), facility.getAmenities());
    }
}
