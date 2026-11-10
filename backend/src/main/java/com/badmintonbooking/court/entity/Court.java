package com.badmintonbooking.court.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "courts")
public class Court {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "facility_id", nullable = false)
    private Long facilityId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facility_id", insertable = false, updatable = false)
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private Facility facility;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "court_number", nullable = false)
    private Integer courtNumber = 1;

    @Column(name = "court_type", nullable = false, length = 50)
    private String courtType = "STANDARD"; // STANDARD, VIP, TRAINING

    @Column(name = "base_price_per_hour", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePricePerHour = BigDecimal.valueOf(100000);

    @Column(name = "surface_type", length = 100)
    private String surfaceType = "Thảm BWF tiêu chuẩn";

    @Column(length = 500)
    private String description;

    @Column(nullable = false, length = 50)
    private String status = "ACTIVE"; // ACTIVE, MAINTENANCE, INACTIVE

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public Court() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFacilityId() { return facilityId; }
    public void setFacilityId(Long facilityId) { this.facilityId = facilityId; }

    public Facility getFacility() { return facility; }
    public void setFacility(Facility facility) { this.facility = facility; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getCourtNumber() { return courtNumber; }
    public void setCourtNumber(Integer courtNumber) { this.courtNumber = courtNumber; }

    public String getCourtType() { return courtType; }
    public void setCourtType(String courtType) { this.courtType = courtType; }

    public BigDecimal getBasePricePerHour() { return basePricePerHour; }
    public void setBasePricePerHour(BigDecimal basePricePerHour) { this.basePricePerHour = basePricePerHour; }

    public String getSurfaceType() { return surfaceType; }
    public void setSurfaceType(String surfaceType) { this.surfaceType = surfaceType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Transient
    public BigDecimal getPricePerHour() {
        return basePricePerHour != null ? basePricePerHour : BigDecimal.valueOf(100000.0);
    }
}
