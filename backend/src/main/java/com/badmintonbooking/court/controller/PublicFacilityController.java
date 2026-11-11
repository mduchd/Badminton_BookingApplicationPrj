package com.badmintonbooking.court.controller;

import com.badmintonbooking.common.ApiResponse;
import com.badmintonbooking.common.exception.ResourceNotFoundException;
import com.badmintonbooking.court.dto.*;
import com.badmintonbooking.court.service.FacilityQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import com.badmintonbooking.common.dto.PageResponse;

@RestController
public class PublicFacilityController {

    private final FacilityQueryService facilityQueryService;

    public PublicFacilityController(FacilityQueryService facilityQueryService) {
        this.facilityQueryService = facilityQueryService;
    }

    public record LegacyFacilitySummary(Long id, String name, String address, String district,
                                        Double latitude, Double longitude, String openHours, BigDecimal minPricePerHour) {}

    @GetMapping("/api/v1/public/facilities")
    public ApiResponse<List<LegacyFacilitySummary>> list() {
        var results = facilityQueryService.searchFacilities(
                null, null, null, null, null, null, null, null, null, null, null, "rating_desc"
        ).stream().map(f -> new LegacyFacilitySummary(
                f.id(), f.name(), f.address(), f.district(), f.latitude(), f.longitude(), f.openHours(), f.minPrice()
        )).toList();
        return ApiResponse.success(results, "Danh sách cụm sân");
    }

    @GetMapping("/api/facilities")
    public ResponseEntity<List<FacilitySummaryDto>> searchFacilities(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String ward,
            @RequestParam(required = false) String sportType,
            @RequestParam(required = false) List<String> amenities,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(required = false, defaultValue = "rating_desc") String sortBy
    ) {
        List<FacilitySummaryDto> result = facilityQueryService.searchFacilities(
                keyword, city, district, ward, sportType, amenities, minPrice, maxPrice, lat, lng, radiusKm, sortBy
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/api/facilities/metadata")
    public ResponseEntity<FacilityFilterMetadataDto> getFilterMetadata() {
        return ResponseEntity.ok(facilityQueryService.getFilterMetadata());
    }

    @GetMapping("/api/facilities/page")
    public PageResponse<FacilityCardDto> searchFacilitiesPage(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) List<String> amenities,
            @RequestParam(required = false) BigDecimal minRating,
            @RequestParam(required = false) List<Long> ids,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return PageResponse.from(facilityQueryService.searchFacilitiesPage(keyword, district, maxPrice, amenities, minRating, ids, page, size));
    }

    @GetMapping("/api/facilities/{id}")
    public ResponseEntity<FacilityDetailDto> getFacilityDetail(
            @PathVariable Long id,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng
    ) {
        FacilityDetailDto detail = facilityQueryService.getFacilityDetail(id, lat, lng);
        requirePublicFacility(detail.facility());
        return ResponseEntity.ok(detail);
    }

    @GetMapping("/api/facilities/{id}/courts")
    public ResponseEntity<List<CourtDto>> getFacilityCourts(@PathVariable Long id) {
        requirePublicFacility(facilityQueryService.getFacilityDetail(id, null, null).facility());
        return ResponseEntity.ok(facilityQueryService.getFacilityCourts(id));
    }

    @GetMapping("/api/facilities/{id}/price-rules")
    public ResponseEntity<List<PriceRuleDto>> getFacilityPriceRules(@PathVariable Long id) {
        requirePublicFacility(facilityQueryService.getFacilityDetail(id, null, null).facility());
        return ResponseEntity.ok(facilityQueryService.getFacilityPriceRules(id));
    }
    private void requirePublicFacility(FacilitySummaryDto facility) {
        if (!Boolean.TRUE.equals(facility.isApproved()) || !"ACTIVE".equalsIgnoreCase(facility.status())) {
            throw new ResourceNotFoundException("Không tìm thấy cụm sân.");
        }
    }
}
