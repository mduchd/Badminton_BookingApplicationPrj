package com.badmintonbooking.court.entity;

import jakarta.persistence.*;
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
    private Facility facility;

    @Column(nullable = false)
    private String name;

    @Column(name = "court_type", nullable = false)
    private String courtType = "STANDARD";

    @Column(nullable = false)
    private String status = "ACTIVE";

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

    public String getCourtType() { return courtType; }
    public void setCourtType(String courtType) { this.courtType = courtType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

}
