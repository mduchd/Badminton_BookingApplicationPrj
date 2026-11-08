package com.badmintonbooking.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "alobooking_public_facility_profiles")
public class AloBookingFacilityProfile {

    @Id
    private Long facilityId;

    @Column(nullable = false, unique = true)
    private String alobookingCode;

    private Integer publishedCourtCount;

    @Column(columnDefinition = "TEXT")
    private String publicContact;

    @Column(columnDefinition = "TEXT")
    private String bookingUrl;

    @Column(columnDefinition = "TEXT")
    private String bookingSourceUrl;

    public Long getFacilityId() { return facilityId; }
    public String getAlobookingCode() { return alobookingCode; }
    public Integer getPublishedCourtCount() { return publishedCourtCount; }
    public String getPublicContact() { return publicContact; }
    public String getBookingUrl() { return bookingUrl; }
    public String getBookingSourceUrl() { return bookingSourceUrl; }
}
