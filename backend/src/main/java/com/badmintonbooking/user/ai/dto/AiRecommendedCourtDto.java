package com.badmintonbooking.user.ai.dto;

import java.util.List;
import java.util.UUID;

public class AiRecommendedCourtDto {
    private UUID facilityId;
    private String facilityName;
    private String address;
    private String district;
    private String openHours;
    private Double rating;
    private Integer reviewCount;
    private String imageUrl;
    private Double minPricePerHour;
    private List<String> amenities;
    private String matchReason;

    public AiRecommendedCourtDto() {}

    public AiRecommendedCourtDto(UUID facilityId, String facilityName, String address, String district,
                                 String openHours, Double rating, Integer reviewCount, String imageUrl,
                                 Double minPricePerHour, List<String> amenities, String matchReason) {
        this.facilityId = facilityId;
        this.facilityName = facilityName;
        this.address = address;
        this.district = district;
        this.openHours = openHours;
        this.rating = rating;
        this.reviewCount = reviewCount;
        this.imageUrl = imageUrl;
        this.minPricePerHour = minPricePerHour;
        this.amenities = amenities;
        this.matchReason = matchReason;
    }

    public UUID getFacilityId() { return facilityId; }
    public void setFacilityId(UUID facilityId) { this.facilityId = facilityId; }

    public String getFacilityName() { return facilityName; }
    public void setFacilityName(String facilityName) { this.facilityName = facilityName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getOpenHours() { return openHours; }
    public void setOpenHours(String openHours) { this.openHours = openHours; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Double getMinPricePerHour() { return minPricePerHour; }
    public void setMinPricePerHour(Double minPricePerHour) { this.minPricePerHour = minPricePerHour; }

    public List<String> getAmenities() { return amenities; }
    public void setAmenities(List<String> amenities) { this.amenities = amenities; }

    public String getMatchReason() { return matchReason; }
    public void setMatchReason(String matchReason) { this.matchReason = matchReason; }
}
