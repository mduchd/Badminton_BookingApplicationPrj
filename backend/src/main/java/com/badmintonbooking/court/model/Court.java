package com.badmintonbooking.court.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "courts")
public class Court {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facility_id", nullable = false)
    private Facility facility;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "court_number", nullable = false)
    private Integer courtNumber;

    @Column(name = "price_per_hour", nullable = false, precision = 12, scale = 2)
    private BigDecimal pricePerHour = BigDecimal.valueOf(100000);

    @Column(nullable = false, length = 30)
    private String status = "AVAILABLE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public Court() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Facility getFacility() { return facility; }
    public void setFacility(Facility facility) { this.facility = facility; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getCourtNumber() { return courtNumber; }
    public void setCourtNumber(Integer courtNumber) { this.courtNumber = courtNumber; }

    public BigDecimal getPricePerHour() { return pricePerHour; }
    public void setPricePerHour(BigDecimal pricePerHour) { this.pricePerHour = pricePerHour; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
