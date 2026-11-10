package com.badmintonbooking.user.ai.dto;

import java.util.ArrayList;
import java.util.List;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public class SearchCriteriaDto {
    private String district;
    private String city;
    private Double maxTotalPrice;
    private Integer durationMinutes;
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public Double getMaxTotalPrice() { return maxTotalPrice; }
    public void setMaxTotalPrice(Double price) { this.maxTotalPrice = price; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer minutes) { this.durationMinutes = minutes; }
    private String date;
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
        if (sportType != null && !List.of("badminton", "pickleball").contains(sportType)) return false;
        if (district != null && district.length() > 150) return false;
        if (city != null && city.length() > 150) return false;
        if (maxTotalPrice != null && (!Double.isFinite(maxTotalPrice) || maxTotalPrice < 0)) return false;
        if (durationMinutes != null && (durationMinutes < 1 || durationMinutes > 1439)) return false;
        if (amenities != null && (amenities.size() > 20 || amenities.stream().anyMatch(a -> a == null || a.length() > 150))) return false;
        if (maxPricePerHour != null && (!Double.isFinite(maxPricePerHour) || maxPricePerHour < 0)) {
            return false;
        }
        try {
            if (date != null) LocalDate.parse(date, DateTimeFormatter.ISO_LOCAL_DATE);
            if (startTime != null && !startTime.matches("\\d{2}:\\d{2}")) return false;
            if (endTime != null && !endTime.matches("\\d{2}:\\d{2}")) return false;
            LocalTime start = startTime == null ? null : LocalTime.parse(startTime, DateTimeFormatter.ISO_LOCAL_TIME);
            LocalTime end = endTime == null ? null : LocalTime.parse(endTime, DateTimeFormatter.ISO_LOCAL_TIME);
            return start == null || end == null || start.isBefore(end);
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

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
