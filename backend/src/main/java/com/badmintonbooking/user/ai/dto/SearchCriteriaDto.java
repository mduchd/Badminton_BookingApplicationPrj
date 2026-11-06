package com.badmintonbooking.user.ai.dto;

import java.util.ArrayList;
import java.util.List;

public class SearchCriteriaDto {
    private String district;
    private String startTime;
    private String endTime;
    private Double maxPricePerHour;
    private List<String> amenities = new ArrayList<>();
    private String sportType = "badminton";
    private Integer durationHours = 2;

    public SearchCriteriaDto() {}

    public SearchCriteriaDto(String district, String startTime, String endTime, Double maxPricePerHour, List<String> amenities, String sportType) {
        this.district = district;
        this.startTime = startTime;
        this.endTime = endTime;
        this.maxPricePerHour = maxPricePerHour;
        if (amenities != null) {
            this.amenities = amenities;
        }
        if (sportType != null) {
            this.sportType = sportType;
        }
    }

    public boolean isValid() {
        if (maxPricePerHour != null && maxPricePerHour < 0) {
            return false;
        }
        if (startTime != null && endTime != null && startTime.compareTo(endTime) >= 0) {
            return false;
        }
        return true;
    }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public Double getMaxPricePerHour() { return maxPricePerHour; }
    public void setMaxPricePerHour(Double maxPricePerHour) { this.maxPricePerHour = maxPricePerHour; }

    public List<String> getAmenities() { return amenities; }
    public void setAmenities(List<String> amenities) { this.amenities = amenities; }

    public String getSportType() { return sportType; }
    public void setSportType(String sportType) { this.sportType = sportType; }

    public Integer getDurationHours() { return durationHours; }
    public void setDurationHours(Integer durationHours) { this.durationHours = durationHours; }
}
