package com.badmintonbooking.court.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "facilities")
public class Facility {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(nullable = false, length = 100)
    private String district;

    @Column(nullable = false, length = 100)
    private String city = "TP. Hồ Chí Minh";

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "open_time", nullable = false)
    private LocalTime openTime = LocalTime.of(5, 30);

    @Column(name = "close_time", nullable = false)
    private LocalTime closeTime = LocalTime.of(23, 0);

    @Column(name = "image_url")
    private String imageUrl;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "facility_amenities_view", joinColumns = @JoinColumn(name = "facility_id"))
    @Column(name = "amenity")
    private List<String> amenities = new ArrayList<>();

    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal rating = BigDecimal.valueOf(5.0);

    @Column(name = "review_count", nullable = false)
    private Integer reviewCount = 0;

    @Column(name = "sport_type", nullable = false, length = 50)
    private String sportType = "badminton";

    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @OneToMany(mappedBy = "facility", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Court> courts = new ArrayList<>();

    public Facility() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOwnerId() { return ownerId; }
    public void setOwnerId(UUID ownerId) { this.ownerId = ownerId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public LocalTime getOpenTime() { return openTime; }
    public void setOpenTime(LocalTime openTime) { this.openTime = openTime; }

    public LocalTime getCloseTime() { return closeTime; }
    public void setCloseTime(LocalTime closeTime) { this.closeTime = closeTime; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public List<String> getAmenities() { return amenities; }
    public void setAmenities(List<String> amenities) { this.amenities = amenities; }

    public BigDecimal getRating() { return rating; }
    public void setRating(BigDecimal rating) { this.rating = rating; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public String getSportType() { return sportType; }
    public void setSportType(String sportType) { this.sportType = sportType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<Court> getCourts() { return courts; }
    public void setCourts(List<Court> courts) { this.courts = courts; }
}
