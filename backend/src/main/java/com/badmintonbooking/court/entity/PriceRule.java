package com.badmintonbooking.court.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

@Entity
@Table(name = "price_rules")
public class PriceRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "facility_id")
    private Long facilityId;

    @Column(name = "court_id")
    private Long courtId; // null = áp dụng toàn cụm sân

    @Column(nullable = false, length = 150)
    private String name = "Khung giờ tiêu chuẩn";

    @Column(name = "day_of_week", nullable = false)
    private Integer dayOfWeek = 0; // 0: all/grouped, 1: Mon ... 7: Sun

    @Column(name = "day_type", nullable = false, length = 30)
    private String dayType = "ALL"; // ALL, WEEKDAY, WEEKEND, MON..SUN

    @Column(name = "customer_type", nullable = false, length = 30)
    private String customerType = "CASUAL"; // CASUAL (vãng lai), FIXED_MONTHLY (cố định tháng)

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "price_per_slot", nullable = false, precision = 12, scale = 2)
    private BigDecimal pricePerSlot;

    @Column(name = "slot_duration_minutes", nullable = false)
    private Integer slotDurationMinutes = 60;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public PriceRule() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFacilityId() { return facilityId; }
    public void setFacilityId(Long facilityId) { this.facilityId = facilityId; }

    public Long getCourtId() { return courtId; }
    public void setCourtId(Long courtId) { this.courtId = courtId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(Integer dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public String getDayType() { return dayType; }
    public void setDayType(String dayType) { this.dayType = dayType; }

    public String getCustomerType() { return customerType; }
    public void setCustomerType(String customerType) { this.customerType = customerType; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public BigDecimal getPricePerSlot() { return pricePerSlot; }
    public void setPricePerSlot(BigDecimal pricePerSlot) { this.pricePerSlot = pricePerSlot; }

    public Integer getSlotDurationMinutes() { return slotDurationMinutes; }
    public void setSlotDurationMinutes(Integer slotDurationMinutes) { this.slotDurationMinutes = slotDurationMinutes; }

    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDate effectiveFrom) { this.effectiveFrom = effectiveFrom; }

    public LocalDate getEffectiveTo() { return effectiveTo; }
    public void setEffectiveTo(LocalDate effectiveTo) { this.effectiveTo = effectiveTo; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
