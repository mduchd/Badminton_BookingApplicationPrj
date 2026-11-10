package com.badmintonbooking.user.ai.dto;

import java.util.List;

public class AiRecommendedCourtDto {
    private Long facilityId;
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
    private Long courtId;
    private String courtName;
    private String date;
    private String startTime;
    private String endTime;
    private java.math.BigDecimal totalPrice;
    private java.time.OffsetDateTime checkedAt;

    public AiRecommendedCourtDto() {}

    public AiRecommendedCourtDto(Long facilityId, String facilityName, String address, String district,
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

    public Long getFacilityId() { return facilityId; }
    public void setFacilityId(Long facilityId) { this.facilityId = facilityId; }

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
    public Long getCourtId() { return courtId; }
    public void setCourtId(Long courtId) { this.courtId = courtId; }
    public String getCourtName() { return courtName; }
    public void setCourtName(String courtName) { this.courtName = courtName; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
    public java.math.BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(java.math.BigDecimal totalPrice) { this.totalPrice = totalPrice; }
    public java.time.OffsetDateTime getCheckedAt() { return checkedAt; }
    public void setCheckedAt(java.time.OffsetDateTime checkedAt) { this.checkedAt = checkedAt; }
}
