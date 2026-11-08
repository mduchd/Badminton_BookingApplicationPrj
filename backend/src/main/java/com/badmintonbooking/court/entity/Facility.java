package com.badmintonbooking.court.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "facilities")
public class Facility {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(unique = true)
    private String slug;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String district;

    @Column(length = 100)
    private String ward;

    @Column(name = "street_address", length = 300)
    private String streetAddress;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(name = "normalized_address", length = 600)
    private String normalizedAddress;

    private Double latitude;
    private Double longitude;

    @Column(name = "open_time", nullable = false)
    private LocalTime openTime = LocalTime.of(5, 0);

    @Column(name = "close_time", nullable = false)
    private LocalTime closeTime = LocalTime.of(23, 0);

    @Column(length = 300)
    private String phone;

    @Column(name = "messenger_url", length = 500)
    private String messengerUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "maps_embed_url", columnDefinition = "TEXT")
    private String mapsEmbedUrl;

    @Column(name = "sport_type", nullable = false, length = 50)
    private String sportType = "badminton";

    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal rating = BigDecimal.ZERO;

    @Column(name = "review_count", nullable = false)
    private Integer reviewCount = 0;

    @Column(name = "min_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal minPrice = BigDecimal.valueOf(80000);

    @Column(name = "max_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal maxPrice = BigDecimal.valueOf(140000);

    @Column(nullable = false, length = 50)
    private String status = "ACTIVE";

    @Column(name = "is_approved", nullable = false)
    private Boolean isApproved = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "facility_amenities", joinColumns = @JoinColumn(name = "facility_id"))
    @Column(name = "amenity", length = 150)
    private Set<String> amenitySet = new LinkedHashSet<>();
    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public Facility() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getWard() { return ward; }
    public void setWard(String ward) { this.ward = ward; }

    public String getStreetAddress() { return streetAddress; }
    public void setStreetAddress(String streetAddress) { this.streetAddress = streetAddress; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getNormalizedAddress() {
        return normalizedAddress != null && !normalizedAddress.isBlank() ? normalizedAddress : address;
    }
    public void setNormalizedAddress(String normalizedAddress) { this.normalizedAddress = normalizedAddress; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public LocalTime getOpenTime() { return openTime; }
    public void setOpenTime(LocalTime openTime) { this.openTime = openTime; }

    public LocalTime getCloseTime() { return closeTime; }
    public void setCloseTime(LocalTime closeTime) { this.closeTime = closeTime; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getMessengerUrl() { return messengerUrl; }
    public void setMessengerUrl(String messengerUrl) { this.messengerUrl = messengerUrl; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getLogoUrl() {
        return logoUrl != null && !logoUrl.isBlank() ? logoUrl : getImageUrl();
    }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public String getImageUrl() {
        return imageUrl;
    }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getMapsEmbedUrl() { return mapsEmbedUrl; }
    public void setMapsEmbedUrl(String mapsEmbedUrl) { this.mapsEmbedUrl = mapsEmbedUrl; }

    public String getSportType() { return sportType; }
    public void setSportType(String sportType) { this.sportType = sportType; }

    public BigDecimal getRating() { return rating != null ? rating : BigDecimal.ZERO; }
    public void setRating(BigDecimal rating) { this.rating = rating; }

    public Integer getReviewCount() { return reviewCount != null ? reviewCount : 0; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public BigDecimal getMinPrice() { return minPrice; }
    public void setMinPrice(BigDecimal minPrice) { this.minPrice = minPrice; }

    public BigDecimal getMaxPrice() { return maxPrice; }
    public void setMaxPrice(BigDecimal maxPrice) { this.maxPrice = maxPrice; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsApproved() { return isApproved != null ? isApproved : true; }
    public void setIsApproved(Boolean isApproved) { this.isApproved = isApproved; }

    public Set<String> getAmenitySet() { return amenitySet; }
    public void setAmenitySet(Set<String> amenitySet) {
        this.amenitySet = amenitySet != null ? new LinkedHashSet<>(amenitySet) : new LinkedHashSet<>();
    }

    @Transient
    public List<String> getAmenities() {
        if (amenitySet != null && !amenitySet.isEmpty()) {
            return new ArrayList<>(amenitySet);
        }
        return List.of();
    }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
