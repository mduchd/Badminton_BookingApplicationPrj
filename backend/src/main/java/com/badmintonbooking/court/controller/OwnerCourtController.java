package com.badmintonbooking.court.controller;

import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.court.dto.*;
import com.badmintonbooking.court.service.CloudinaryUploadService;
import com.badmintonbooking.court.service.OwnerCourtManagementService;
import com.badmintonbooking.security.OwnerAuthorizationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner")
public class OwnerCourtController {

    private final OwnerCourtManagementService ownerService;
    private final CloudinaryUploadService cloudinaryUploadService;
    private final OwnerAuthorizationService ownerAuthService;

    public OwnerCourtController(
            OwnerCourtManagementService ownerService,
            CloudinaryUploadService cloudinaryUploadService,
            OwnerAuthorizationService ownerAuthService
    ) {
        this.ownerService = ownerService;
        this.cloudinaryUploadService = cloudinaryUploadService;
        this.ownerAuthService = ownerAuthService;
    }

    // ==================== 1. FACILITIES ====================

    @GetMapping("/facilities")
    public ResponseEntity<List<FacilitySummaryDto>> getOwnerFacilities() {
        return ResponseEntity.ok(ownerService.getOwnerFacilities());
    }

    @PostMapping("/facilities")
    public ResponseEntity<FacilitySummaryDto> createFacility(@Valid @RequestBody FacilityUpsertRequest request) {
        FacilitySummaryDto created = ownerService.createFacility(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/facilities/{id}")
    public ResponseEntity<FacilitySummaryDto> updateFacility(
            @PathVariable Long id,
            @Valid @RequestBody FacilityUpsertRequest request
    ) {
        return ResponseEntity.ok(ownerService.updateFacility(id, request));
    }

    @PatchMapping("/facilities/{id}/status")
    public ResponseEntity<FacilitySummaryDto> updateFacilityStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        String status = payload != null ? payload.get("status") : null;
        if (status == null || status.isBlank()) {
            throw new BadRequestException("Thiếu trạng thái cụm sân cần cập nhật.");
        }
        return ResponseEntity.ok(ownerService.updateFacilityStatus(id, status));
    }

    @DeleteMapping("/facilities/{id}")
    public ResponseEntity<Void> deleteFacility(@PathVariable Long id) {
        ownerService.deleteOrDeactivateFacility(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== 2. SUB-COURTS ====================

    @PostMapping("/facilities/{facilityId}/courts")
    public ResponseEntity<CourtDto> addCourt(
            @PathVariable Long facilityId,
            @Valid @RequestBody CourtUpsertRequest request
    ) {
        CourtDto created = ownerService.addCourt(facilityId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/courts/{courtId}")
    public ResponseEntity<CourtDto> updateCourt(
            @PathVariable Long courtId,
            @Valid @RequestBody CourtUpsertRequest request
    ) {
        return ResponseEntity.ok(ownerService.updateCourt(courtId, request));
    }

    @DeleteMapping("/courts/{courtId}")
    public ResponseEntity<Void> deleteCourt(@PathVariable Long courtId) {
        ownerService.deleteCourt(courtId);
        return ResponseEntity.noContent().build();
    }

    // ==================== 3. PRICING RULES ====================

    @GetMapping("/facilities/{facilityId}/price-rules")
    public ResponseEntity<List<PriceRuleDto>> getPriceRules(@PathVariable Long facilityId) {
        return ResponseEntity.ok(ownerService.getOwnerPriceRules(facilityId));
    }

    @PostMapping("/facilities/{facilityId}/price-rules")
    public ResponseEntity<PriceRuleDto> createPriceRule(
            @PathVariable Long facilityId,
            @Valid @RequestBody PriceRuleUpsertRequest request
    ) {
        PriceRuleDto created = ownerService.createPriceRule(facilityId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/price-rules/{ruleId}")
    public ResponseEntity<PriceRuleDto> updatePriceRule(
            @PathVariable Long ruleId,
            @Valid @RequestBody PriceRuleUpsertRequest request
    ) {
        return ResponseEntity.ok(ownerService.updatePriceRule(ruleId, request));
    }

    @DeleteMapping("/price-rules/{ruleId}")
    public ResponseEntity<Void> deletePriceRule(@PathVariable Long ruleId) {
        ownerService.deletePriceRule(ruleId);
        return ResponseEntity.noContent().build();
    }

    // ==================== 4. MAINTENANCE BLOCKS ====================

    @GetMapping("/facilities/{facilityId}/maintenance")
    public ResponseEntity<List<MaintenanceBlockDto>> getMaintenanceBlocks(@PathVariable Long facilityId) {
        return ResponseEntity.ok(ownerService.getMaintenanceBlocks(facilityId));
    }

    @PostMapping("/facilities/{facilityId}/maintenance")
    public ResponseEntity<List<MaintenanceBlockDto>> createMaintenanceBlock(
            @PathVariable Long facilityId,
            @Valid @RequestBody MaintenanceCreateRequest request
    ) {
        List<MaintenanceBlockDto> created = ownerService.createMaintenanceBlock(facilityId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/maintenance/{occupancyId}")
    public ResponseEntity<Void> releaseMaintenanceBlock(@PathVariable Long occupancyId) {
        ownerService.releaseMaintenanceBlock(occupancyId);
        return ResponseEntity.noContent().build();
    }

    // ==================== 5. DASHBOARD & REVENUE ====================

    @GetMapping("/dashboard")
    public ResponseEntity<OwnerDashboardDto> getDashboard(
            @RequestParam(required = false) Long facilityId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return ResponseEntity.ok(ownerService.getOwnerDashboard(facilityId, fromDate, toDate));
    }

    // ==================== 6. BOOKINGS & GUEST CHECK-IN ====================

    @GetMapping("/bookings")
    public ResponseEntity<List<OwnerBookingItemDto>> getBookings(
            @RequestParam(required = false) Long facilityId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(ownerService.getOwnerBookings(facilityId, status, date, keyword));
    }

    @PatchMapping("/bookings/{bookingId}/status")
    public ResponseEntity<OwnerBookingItemDto> updateBookingStatus(
            @PathVariable Long bookingId,
            @Valid @RequestBody OwnerBookingStatusRequest request
    ) {
        return ResponseEntity.ok(ownerService.updateOwnerBookingStatus(bookingId, request.status()));
    }

    // ==================== 7. CLOUDINARY / LOCAL IMAGE UPLOAD ====================

    @PostMapping(value = "/uploads/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<UploadedImageDto>> uploadImages(
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @RequestParam(value = "file", required = false) MultipartFile singleFile,
            HttpServletRequest servletRequest
    ) {
        ownerAuthService.requireCurrentOwnerOrAdmin();

        List<MultipartFile> toUpload = new ArrayList<>();
        if (files != null) {
            toUpload.addAll(files);
        }
        if (singleFile != null && !singleFile.isEmpty()) {
            toUpload.add(singleFile);
        }
        if (toUpload.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn ít nhất một tệp ảnh để tải lên.");
        }

        String baseOrigin = buildBaseOrigin(servletRequest);
        List<UploadedImageDto> uploaded = toUpload.stream()
                .map(file -> cloudinaryUploadService.uploadImage(file, baseOrigin))
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(uploaded);
    }

    private String buildBaseOrigin(HttpServletRequest req) {
        String scheme = req.getHeader("X-Forwarded-Proto");
        if (scheme == null || scheme.isBlank()) {
            scheme = req.getScheme();
        }
        String host = req.getHeader("X-Forwarded-Host");
        if (host == null || host.isBlank()) {
            int port = req.getServerPort();
            boolean standardPort = ("http".equalsIgnoreCase(scheme) && port == 80)
                    || ("https".equalsIgnoreCase(scheme) && port == 443);
            host = standardPort ? req.getServerName() : req.getServerName() + ":" + port;
        }
        return scheme + "://" + host;
    }
}
