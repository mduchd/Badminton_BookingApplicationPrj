package com.badmintonbooking.court.service;

import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.entity.CourtOccupancy;
import com.badmintonbooking.booking.enums.ActiveStatus;
import com.badmintonbooking.booking.enums.BookingStatus;
import com.badmintonbooking.booking.enums.OccupancyType;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.booking.repository.CourtOccupancyRepository;
import com.badmintonbooking.booking.service.AvailabilityService;
import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.common.exception.ResourceNotFoundException;
import com.badmintonbooking.common.exception.SlotConflictException;
import com.badmintonbooking.court.dto.*;
import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.entity.FacilityImage;
import com.badmintonbooking.court.entity.PriceRule;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityImageRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.court.repository.PriceRuleRepository;
import com.badmintonbooking.security.OwnerAuthorizationService;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OwnerCourtManagementService {

    private static final DateTimeFormatter SHORT_DATE = DateTimeFormatter.ofPattern("dd/MM");

    private final FacilityRepository facilityRepository;
    private final CourtRepository courtRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final FacilityImageRepository facilityImageRepository;
    private final BookingRepository bookingRepository;
    private final CourtOccupancyRepository occupancyRepository;
    private final UserRepository userRepository;
    private final AddressNormalizerService addressNormalizerService;
    private final FacilityQueryService facilityQueryService;
    private final OwnerAuthorizationService ownerAuthService;

    public OwnerCourtManagementService(
            FacilityRepository facilityRepository,
            CourtRepository courtRepository,
            PriceRuleRepository priceRuleRepository,
            FacilityImageRepository facilityImageRepository,
            BookingRepository bookingRepository,
            CourtOccupancyRepository occupancyRepository,
            UserRepository userRepository,
            AddressNormalizerService addressNormalizerService,
            FacilityQueryService facilityQueryService,
            OwnerAuthorizationService ownerAuthService
    ) {
        this.facilityRepository = facilityRepository;
        this.courtRepository = courtRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.facilityImageRepository = facilityImageRepository;
        this.bookingRepository = bookingRepository;
        this.occupancyRepository = occupancyRepository;
        this.userRepository = userRepository;
        this.addressNormalizerService = addressNormalizerService;
        this.facilityQueryService = facilityQueryService;
        this.ownerAuthService = ownerAuthService;
    }

    // ==================== 1. FACILITY CRUD ====================

    @Transactional(readOnly = true)
    public List<FacilitySummaryDto> getOwnerFacilities() {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        List<Facility> list = ownerAuthService.isAdmin(actor)
                ? facilityRepository.findAllByOrderByCreatedAtDesc()
                : facilityRepository.findByOwnerIdOrderByCreatedAtDesc(actor.getId());
        return facilityQueryService.toFacilitySummaries(list, null, null);
    }

    @Transactional
    public FacilitySummaryDto createFacility(FacilityUpsertRequest req) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();

        Facility facility = new Facility();
        facility.setOwnerId(actor.getId());
        applyFacilityFields(facility, req, true);

        Facility saved = facilityRepository.save(facility);
        syncGalleryImages(saved.getId(), req.imageUrl(), req.galleryImages());

        if (req.courts() != null && !req.courts().isEmpty()) {
            int idx = 1;
            for (CourtUpsertRequest cr : req.courts()) {
                createCourtEntity(saved.getId(), cr, idx++);
            }
        } else {
            // Tạo mặc định 2 sân con tiêu chuẩn nếu chủ sân chưa nhập danh sách sân
            createCourtEntity(saved.getId(), new CourtUpsertRequest(
                    "Sân 1 (Tiêu chuẩn)", 1, "STANDARD", BigDecimal.valueOf(110000), "Thảm BWF tiêu chuẩn", null, "ACTIVE"
            ), 1);
            createCourtEntity(saved.getId(), new CourtUpsertRequest(
                    "Sân 2 (Tiêu chuẩn)", 2, "STANDARD", BigDecimal.valueOf(110000), "Thảm BWF tiêu chuẩn", null, "ACTIVE"
            ), 2);
        }

        recalculateFacilityPriceBounds(saved);
        return facilityQueryService.getFacilityDetail(saved.getId(), null, null).facility();
    }

    @Transactional
    public FacilitySummaryDto updateFacility(Long facilityId, FacilityUpsertRequest req) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        Facility facility = requireManagedFacility(facilityId, actor);

        applyFacilityFields(facility, req, false);
        facility.setUpdatedAt(OffsetDateTime.now());
        Facility saved = facilityRepository.save(facility);

        if (req.galleryImages() != null || req.imageUrl() != null) {
            syncGalleryImages(saved.getId(), saved.getImageUrl(), req.galleryImages());
        }

        recalculateFacilityPriceBounds(saved);
        return facilityQueryService.getFacilityDetail(saved.getId(), null, null).facility();
    }

    @Transactional
    public FacilitySummaryDto updateFacilityStatus(Long facilityId, String nextStatus) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        Facility facility = requireManagedFacility(facilityId, actor);
        String normalized = normalizeFacilityStatus(nextStatus);
        facility.setStatus(normalized);
        facility.setUpdatedAt(OffsetDateTime.now());
        facilityRepository.save(facility);
        return facilityQueryService.getFacilityDetail(facility.getId(), null, null).facility();
    }

    @Transactional
    public void deleteOrDeactivateFacility(Long facilityId) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        Facility facility = requireManagedFacility(facilityId, actor);
        List<Booking> existingBookings = bookingRepository.findByFacilityIdOrderByCreatedAtDesc(facilityId);
        if (existingBookings.isEmpty()) {
            facilityRepository.delete(facility);
        } else {
            facility.setStatus("INACTIVE");
            facility.setUpdatedAt(OffsetDateTime.now());
            facilityRepository.save(facility);
        }
    }

    // ==================== 2. SUB-COURT CRUD ====================

    @Transactional
    public CourtDto addCourt(Long facilityId, CourtUpsertRequest req) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        Facility facility = requireManagedFacility(facilityId, actor);

        List<Court> existing = courtRepository.findByFacilityIdOrderByCourtNumberAscIdAsc(facilityId);
        int nextNum = req.courtNumber() != null
                ? req.courtNumber()
                : existing.stream().mapToInt(c -> c.getCourtNumber() != null ? c.getCourtNumber() : 0).max().orElse(0) + 1;

        Court saved = createCourtEntity(facilityId, req, nextNum);
        recalculateFacilityPriceBounds(facility);
        return facilityQueryService.toCourtDto(saved);
    }

    @Transactional
    public CourtDto updateCourt(Long courtId, CourtUpsertRequest req) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        Court court = courtRepository.findById(courtId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân con với id: " + courtId));
        Facility facility = requireManagedFacility(court.getFacilityId(), actor);

        court.setName(req.name().trim());
        if (req.courtNumber() != null && req.courtNumber() > 0) {
            court.setCourtNumber(req.courtNumber());
        }
        if (req.courtType() != null && !req.courtType().isBlank()) {
            court.setCourtType(req.courtType().trim().toUpperCase(Locale.ROOT));
        }
        if (req.basePricePerHour() != null) {
            court.setBasePricePerHour(req.basePricePerHour());
        }
        if (req.surfaceType() != null) {
            court.setSurfaceType(req.surfaceType().trim());
        }
        if (req.description() != null) {
            court.setDescription(req.description().trim());
        }
        if (req.status() != null && !req.status().isBlank()) {
            court.setStatus(req.status().trim().toUpperCase(Locale.ROOT));
        }
        court.setUpdatedAt(OffsetDateTime.now());

        Court saved = courtRepository.save(court);
        recalculateFacilityPriceBounds(facility);
        return facilityQueryService.toCourtDto(saved);
    }

    @Transactional
    public void deleteCourt(Long courtId) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        Court court = courtRepository.findById(courtId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân con với id: " + courtId));
        Facility facility = requireManagedFacility(court.getFacilityId(), actor);

        boolean hasActiveBookings = !bookingRepository.findByCourtIdAndBookingDate(courtId, LocalDate.now()).isEmpty();
        if (hasActiveBookings) {
            court.setStatus("INACTIVE");
            court.setUpdatedAt(OffsetDateTime.now());
            courtRepository.save(court);
        } else {
            try {
                courtRepository.delete(court);
                courtRepository.flush();
            } catch (Exception ex) {
                court.setStatus("INACTIVE");
                court.setUpdatedAt(OffsetDateTime.now());
                courtRepository.save(court);
            }
        }
        recalculateFacilityPriceBounds(facility);
    }

    // ==================== 3. PRICING RULES CRUD ====================

    @Transactional(readOnly = true)
    public List<PriceRuleDto> getOwnerPriceRules(Long facilityId) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        requireManagedFacility(facilityId, actor);
        return facilityQueryService.getFacilityPriceRules(facilityId);
    }

    @Transactional
    public PriceRuleDto createPriceRule(Long facilityId, PriceRuleUpsertRequest req) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        Facility facility = requireManagedFacility(facilityId, actor);
        validatePriceRuleWindow(req);

        if (req.courtId() != null) {
            Court court = courtRepository.findById(req.courtId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân con để áp bảng giá."));
            if (!court.getFacilityId().equals(facilityId)) {
                throw new BadRequestException("Sân con không thuộc cụm sân đã chọn.");
            }
        }

        PriceRule rule = new PriceRule();
        rule.setFacilityId(facilityId);
        applyPriceRuleFields(rule, req);
        PriceRule saved = priceRuleRepository.save(rule);

        recalculateFacilityPriceBounds(facility);
        Map<Long, String> courtNames = getCourtNameMap(facilityId);
        return facilityQueryService.toPriceRuleDto(saved, courtNames);
    }

    @Transactional
    public PriceRuleDto updatePriceRule(Long ruleId, PriceRuleUpsertRequest req) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        PriceRule rule = priceRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quy tắc giá với id: " + ruleId));

        Long facId = rule.getFacilityId();
        if (facId == null && rule.getCourtId() != null) {
            facId = courtRepository.findById(rule.getCourtId()).map(Court::getFacilityId).orElse(null);
            rule.setFacilityId(facId);
        }
        Facility facility = requireManagedFacility(facId, actor);
        validatePriceRuleWindow(req);

        applyPriceRuleFields(rule, req);
        PriceRule saved = priceRuleRepository.save(rule);

        recalculateFacilityPriceBounds(facility);
        return facilityQueryService.toPriceRuleDto(saved, getCourtNameMap(facility.getId()));
    }

    @Transactional
    public void deletePriceRule(Long ruleId) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        PriceRule rule = priceRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy quy tắc giá với id: " + ruleId));

        Long facId = rule.getFacilityId();
        if (facId == null && rule.getCourtId() != null) {
            facId = courtRepository.findById(rule.getCourtId()).map(Court::getFacilityId).orElse(null);
        }
        Facility facility = facId != null ? requireManagedFacility(facId, actor) : null;
        priceRuleRepository.delete(rule);

        if (facility != null) {
            recalculateFacilityPriceBounds(facility);
        }
    }

    // ==================== 4. MAINTENANCE BLOCKS ====================

    @Transactional(readOnly = true)
    public List<MaintenanceBlockDto> getMaintenanceBlocks(Long facilityId) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        Facility facility = requireManagedFacility(facilityId, actor);
        List<Court> courts = courtRepository.findByFacilityIdOrderByCourtNumberAscIdAsc(facilityId);
        if (courts.isEmpty()) return List.of();

        Map<Long, String> courtNames = courts.stream()
                .collect(Collectors.toMap(Court::getId, Court::getName, (a, b) -> a));
        List<Long> courtIds = courts.stream().map(Court::getId).toList();

        return occupancyRepository.findByCourtIdInAndOccupancyTypeAndActiveStatus(
                        courtIds, OccupancyType.MAINTENANCE, ActiveStatus.ACTIVE
                ).stream()
                .map(o -> facilityQueryService.toMaintenanceDto(o, facility, courtNames))
                .toList();
    }

    @Transactional
    public List<MaintenanceBlockDto> createMaintenanceBlock(Long facilityId, MaintenanceCreateRequest req) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        Facility facility = requireManagedFacility(facilityId, actor);

        if (!req.startTime().isBefore(req.endTime())) {
            throw new BadRequestException("Giờ bắt đầu khóa sân phải nhỏ hơn giờ kết thúc.");
        }

        List<Court> targetCourts;
        if (Boolean.TRUE.equals(req.applyAllCourts()) || req.courtId() == null || req.courtId() <= 0) {
            targetCourts = courtRepository.findByFacilityIdOrderByCourtNumberAscIdAsc(facilityId);
            if (targetCourts.isEmpty()) {
                throw new BadRequestException("Cụm sân chưa có sân con nào để tạo lịch bảo trì.");
            }
        } else {
            Court court = courtRepository.findById(req.courtId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân con với id: " + req.courtId()));
            if (!court.getFacilityId().equals(facilityId)) {
                throw new BadRequestException("Sân con không thuộc cụm sân đang chọn.");
            }
            targetCourts = List.of(court);
        }

        OffsetDateTime startAt = req.date().atTime(req.startTime()).atZone(AvailabilityService.ZONE_VN).toOffsetDateTime();
        OffsetDateTime endAt = req.date().atTime(req.endTime()).atZone(AvailabilityService.ZONE_VN).toOffsetDateTime();

        for (Court c : targetCourts) {
            List<CourtOccupancy> conflicts = occupancyRepository.findActiveOverlapping(c.getId(), startAt, endAt);
            if (!conflicts.isEmpty()) {
                throw new SlotConflictException("Sân '" + c.getName() + "' đang có khách đặt hoặc đã khóa lịch trong khung giờ "
                        + req.startTime() + " - " + req.endTime() + ".");
            }
        }

        Map<Long, String> courtNames = getCourtNameMap(facilityId);
        List<MaintenanceBlockDto> created = new ArrayList<>();
        for (Court c : targetCourts) {
            CourtOccupancy occ = new CourtOccupancy(c.getId(), null, startAt, endAt, OccupancyType.MAINTENANCE);
            occ.setNote(req.reason().trim());
            occ.setCreatedBy(actor.getId());
            CourtOccupancy saved = occupancyRepository.save(occ);
            created.add(facilityQueryService.toMaintenanceDto(saved, facility, courtNames));
        }

        return created;
    }

    @Transactional
    public void releaseMaintenanceBlock(Long occupancyId) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        CourtOccupancy occ = occupancyRepository.findById(occupancyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch khóa bảo trì."));

        Court court = courtRepository.findById(occ.getCourtId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân con."));
        requireManagedFacility(court.getFacilityId(), actor);

        if (occ.getOccupancyType() != OccupancyType.MAINTENANCE) {
            throw new BadRequestException("Bản ghi này không phải lịch bảo trì.");
        }

        occ.setActiveStatus(ActiveStatus.RELEASED);
        occupancyRepository.save(occ);
    }

    // ==================== 5. OWNER BOOKINGS & CHECK-IN ====================

    @Transactional(readOnly = true)
    public List<OwnerBookingItemDto> getOwnerBookings(Long facilityId, String status, LocalDate date, String keyword) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        List<Facility> managedFacilities = ownerAuthService.isAdmin(actor)
                ? facilityRepository.findAllByOrderByCreatedAtDesc()
                : facilityRepository.findByOwnerIdOrderByCreatedAtDesc(actor.getId());

        if (managedFacilities.isEmpty()) {
            return List.of();
        }

        Map<Long, Facility> facMap = managedFacilities.stream()
                .collect(Collectors.toMap(Facility::getId, f -> f));

        List<Long> targetFacilityIds;
        if (facilityId != null) {
            if (!facMap.containsKey(facilityId)) {
                requireManagedFacility(facilityId, actor);
            }
            targetFacilityIds = List.of(facilityId);
        } else {
            targetFacilityIds = new ArrayList<>(facMap.keySet());
        }

        List<Booking> bookings = bookingRepository.findByFacilityIdInOrderByBookingDateDescStartTimeDesc(targetFacilityIds);
        return toOwnerBookingDtos(bookings, facMap).stream()
                .filter(b -> status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)
                        || b.status().equalsIgnoreCase(status))
                .filter(b -> date == null || date.equals(b.bookingDate()))
                .filter(b -> {
                    if (keyword == null || keyword.isBlank()) return true;
                    String q = keyword.trim().toLowerCase(Locale.ROOT);
                    return b.bookingCode().toLowerCase(Locale.ROOT).contains(q)
                            || b.customerName().toLowerCase(Locale.ROOT).contains(q)
                            || (b.customerPhone() != null && b.customerPhone().contains(q))
                            || b.courtName().toLowerCase(Locale.ROOT).contains(q);
                })
                .toList();
    }

    @Transactional
    public OwnerBookingItemDto updateOwnerBookingStatus(Long bookingId, String nextStatusRaw) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt sân với id: " + bookingId));

        Facility facility = requireManagedFacility(booking.getFacilityId(), actor);
        BookingStatus nextStatus;
        try {
            nextStatus = BookingStatus.valueOf(nextStatusRaw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Trạng thái đơn đặt không hợp lệ: " + nextStatusRaw);
        }

        BookingStatus currentStatus = booking.getStatus();
        if (nextStatus == BookingStatus.CONFIRMED) {
            throw new BadRequestException("Đơn đặt sân chỉ được xác nhận tự động sau khi thanh toán payOS thành công.");
        }
        if (currentStatus == nextStatus) {
            return toOwnerBookingDtos(List.of(booking), Map.of(facility.getId(), facility)).getFirst();
        }

        boolean held = currentStatus == BookingStatus.HELD || currentStatus == BookingStatus.PENDING_PAYMENT;
        boolean confirmed = currentStatus == BookingStatus.CONFIRMED;
        boolean allowed = switch (nextStatus) {
            case COMPLETED -> confirmed;
            case CANCELLED -> held || confirmed;
            default -> false;
        };
        if (!allowed) {
            throw new BadRequestException("Không thể chuyển đơn từ " + currentStatus + " sang " + nextStatus + ".");
        }

        OffsetDateTime now = OffsetDateTime.now();
        List<CourtOccupancy> occupancies = occupancyRepository.findByBookingId(bookingId);
        if (nextStatus == BookingStatus.CANCELLED) {
            for (CourtOccupancy occupancy : occupancies) {
                occupancy.setActiveStatus(ActiveStatus.RELEASED);
            }
        }
        booking.setStatus(nextStatus);
        booking.setUpdatedAt(now);

        return toOwnerBookingDtos(List.of(booking), Map.of(facility.getId(), facility)).getFirst();
    }

    // ==================== 6. OWNER REVENUE & LIVE STATUS DASHBOARD ====================

    @Transactional(readOnly = true)
    public OwnerDashboardDto getOwnerDashboard(Long facilityIdParam, LocalDate fromDateParam, LocalDate toDateParam) {
        User actor = ownerAuthService.requireCurrentOwnerOrAdmin();
        List<Facility> managed = ownerAuthService.isAdmin(actor)
                ? facilityRepository.findAllByOrderByCreatedAtDesc()
                : facilityRepository.findByOwnerIdOrderByCreatedAtDesc(actor.getId());

        if (managed.isEmpty()) {
            LocalDate today = LocalDate.now(AvailabilityService.ZONE_VN);
            return new OwnerDashboardDto(
                    null, "Chưa có cụm sân", today.minusDays(6), today,
                    BigDecimal.ZERO, BigDecimal.ZERO, 0, 0, 0, 0, 0.0, 0, 0, 0,
                    List.of(), List.of(), List.of(), List.of(), List.of()
            );
        }

        Facility facility = facilityIdParam != null
                ? requireManagedFacility(facilityIdParam, actor)
                : managed.getFirst();

        LocalDate today = LocalDate.now(AvailabilityService.ZONE_VN);
        LocalDate toDate = toDateParam != null ? toDateParam : today;
        LocalDate fromDate = fromDateParam != null ? fromDateParam : toDate.minusDays(6);
        if (fromDate.isAfter(toDate)) {
            fromDate = toDate.minusDays(6);
        }

        List<Court> courts = courtRepository.findByFacilityIdOrderByCourtNumberAscIdAsc(facility.getId());
        Map<Long, Court> courtMap = courts.stream().collect(Collectors.toMap(Court::getId, c -> c));

        List<Booking> rangeBookings = bookingRepository.findByFacilityIdAndBookingDateBetweenOrderByBookingDateAscStartTimeAsc(
                facility.getId(), fromDate, toDate
        );
        List<Booking> todayBookings = bookingRepository.findByFacilityIdAndBookingDateBetweenOrderByBookingDateAscStartTimeAsc(
                facility.getId(), today, today
        );

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal todayRevenue = BigDecimal.ZERO;
        int confirmedCount = 0;
        int completedCount = 0;
        int heldCount = 0;
        int cancelledCount = 0;
        double totalBookedHours = 0.0;

        for (Booking b : rangeBookings) {
            if (b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.COMPLETED) {
                totalRevenue = totalRevenue.add(b.getTotalAmount());
                double hrs = Duration.between(b.getStartTime(), b.getEndTime()).toMinutes() / 60.0;
                totalBookedHours += Math.max(hrs, 0.0);
                if (b.getStatus() == BookingStatus.CONFIRMED) confirmedCount++;
                else completedCount++;
            } else if (b.getStatus() == BookingStatus.HELD || b.getStatus() == BookingStatus.PENDING_PAYMENT) {
                heldCount++;
            } else if (b.getStatus() == BookingStatus.CANCELLED) {
                cancelledCount++;
            }
        }

        for (Booking b : todayBookings) {
            if (b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.COMPLETED) {
                todayRevenue = todayRevenue.add(b.getTotalAmount());
            }
        }

        int activeCourts = (int) courts.stream().filter(c -> "ACTIVE".equalsIgnoreCase(c.getStatus())).count();
        int maintCourts = (int) courts.stream().filter(c -> "MAINTENANCE".equalsIgnoreCase(c.getStatus())).count();
        double openHoursPerDay = Math.max(1.0, Duration.between(facility.getOpenTime(), facility.getCloseTime()).toMinutes() / 60.0);
        long daysSpan = Math.max(1L, Duration.between(fromDate.atStartOfDay(), toDate.plusDays(1).atStartOfDay()).toDays());
        double capacityHours = Math.max(1.0, activeCourts * openHoursPerDay * daysSpan);
        double occupancyRate = Math.min(100.0, Math.round((totalBookedHours / capacityHours) * 1000.0) / 10.0);

        // Chuỗi doanh thu theo ngày
        Map<LocalDate, List<Booking>> byDate = rangeBookings.stream()
                .collect(Collectors.groupingBy(Booking::getBookingDate));
        List<OwnerDashboardDto.DailyRevenuePoint> dailySeries = new ArrayList<>();
        LocalDate cursor = fromDate;
        while (!cursor.isAfter(toDate)) {
            List<Booking> dayList = byDate.getOrDefault(cursor, List.of());
            BigDecimal rev = dayList.stream()
                    .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.COMPLETED)
                    .map(Booking::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            int cnt = (int) dayList.stream()
                    .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.COMPLETED)
                    .count();
            dailySeries.add(new OwnerDashboardDto.DailyRevenuePoint(
                    cursor, cursor.format(SHORT_DATE), rev, cnt
            ));
            cursor = cursor.plusDays(1);
        }

        // Doanh thu theo từng sân con
        List<OwnerDashboardDto.CourtRevenueItem> courtRevs = new ArrayList<>();
        for (Court c : courts) {
            List<Booking> cBookings = rangeBookings.stream()
                    .filter(b -> c.getId().equals(b.getCourtId()))
                    .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.COMPLETED)
                    .toList();
            BigDecimal cRev = cBookings.stream().map(Booking::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            double cHours = cBookings.stream()
                    .mapToDouble(b -> Duration.between(b.getStartTime(), b.getEndTime()).toMinutes() / 60.0)
                    .sum();
            courtRevs.add(new OwnerDashboardDto.CourtRevenueItem(
                    c.getId(), c.getName(), c.getCourtType(), c.getStatus(),
                    cRev, cBookings.size(), Math.round(cHours * 10.0) / 10.0
            ));
        }

        // Phân bổ khung giờ
        List<OwnerDashboardDto.HourlyBandOccupancy> bands = buildHourlyBands(rangeBookings, Math.max(1, activeCourts), daysSpan);

        // Sơ đồ trạng thái sân trực quan thời gian thực
        OffsetDateTime now = OffsetDateTime.now(AvailabilityService.ZONE_VN);
        List<OwnerDashboardDto.LiveCourtStatusItem> liveStatuses = new ArrayList<>();
        for (Court c : courts) {
            if (!"ACTIVE".equalsIgnoreCase(c.getStatus())) {
                liveStatuses.add(new OwnerDashboardDto.LiveCourtStatusItem(
                        c.getId(), c.getName(), c.getCourtType(), "MAINTENANCE", "Tạm đóng bảo dưỡng"
                ));
                continue;
            }
            List<CourtOccupancy> currentOcc = occupancyRepository.findActiveOverlapping(
                    c.getId(), now, now.plusMinutes(30)
            );
            if (currentOcc.isEmpty()) {
                liveStatuses.add(new OwnerDashboardDto.LiveCourtStatusItem(
                        c.getId(), c.getName(), c.getCourtType(), "AVAILABLE", "Đang trống - Sẵn sàng nhận khách"
                ));
            } else {
                CourtOccupancy occ = currentOcc.getFirst();
                String status = switch (occ.getOccupancyType()) {
                    case MAINTENANCE -> "MAINTENANCE";
                    case HOLD -> "HELD";
                    case BOOKING -> "PLAYING";
                };
                LocalTime endLocal = occ.getEndAt().atZoneSameInstant(AvailabilityService.ZONE_VN).toLocalTime();
                String info = switch (occ.getOccupancyType()) {
                    case MAINTENANCE -> occ.getNote() != null ? occ.getNote() : "Đang khóa bảo trì đến " + endLocal;
                    case HOLD -> "Khách đang giữ chỗ thanh toán đến " + endLocal;
                    case BOOKING -> "Có khách đặt đến " + endLocal;
                };
                liveStatuses.add(new OwnerDashboardDto.LiveCourtStatusItem(
                        c.getId(), c.getName(), c.getCourtType(), status, info
                ));
            }
        }

        List<OwnerBookingItemDto> todayQueue = toOwnerBookingDtos(
                todayBookings.stream().filter(b -> b.getStatus() != BookingStatus.CANCELLED).toList(),
                Map.of(facility.getId(), facility)
        );

        return new OwnerDashboardDto(
                facility.getId(),
                facility.getName(),
                fromDate,
                toDate,
                totalRevenue,
                todayRevenue,
                confirmedCount,
                completedCount,
                heldCount,
                cancelledCount,
                occupancyRate,
                activeCourts,
                maintCourts,
                courts.size(),
                dailySeries,
                courtRevs,
                bands,
                liveStatuses,
                todayQueue
        );
    }

    // ==================== PRIVATE HELPERS ====================

    private Facility requireManagedFacility(Long facilityId, User actor) {
        if (facilityId == null) {
            throw new BadRequestException("Thiếu mã cụm sân.");
        }
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cụm sân với id: " + facilityId));
        ownerAuthService.assertCanManageFacility(facility, actor);
        return facility;
    }

    private void applyFacilityFields(Facility facility, FacilityUpsertRequest req, boolean isNew) {
        String cleanName = req.name().trim();
        facility.setName(cleanName);

        if (isNew || facility.getSlug() == null || facility.getSlug().isBlank()) {
            String baseSlug = addressNormalizerService.toSlug(cleanName);
            String candidate = baseSlug;
            int suffix = 1;
            while (facilityRepository.existsBySlug(candidate)) {
                candidate = baseSlug + "-" + (suffix++);
            }
            facility.setSlug(candidate);
        }

        var normalizedLoc = addressNormalizerService.normalize(
                req.city(),
                req.district(),
                req.ward(),
                req.streetAddress(),
                req.address(),
                req.latitude(),
                req.longitude()
        );

        facility.setCity(normalizedLoc.city());
        facility.setDistrict(normalizedLoc.district());
        facility.setWard(normalizedLoc.ward());
        facility.setStreetAddress(normalizedLoc.streetAddress());
        facility.setAddress(normalizedLoc.rawAddress());
        facility.setNormalizedAddress(normalizedLoc.normalizedAddress());
        facility.setLatitude(normalizedLoc.latitude());
        facility.setLongitude(normalizedLoc.longitude());
        facility.setMapsEmbedUrl(normalizedLoc.mapsEmbedUrl());

        LocalTime open = req.openTime() != null ? req.openTime() : LocalTime.of(5, 30);
        LocalTime close = req.closeTime() != null ? req.closeTime() : LocalTime.of(23, 0);
        if (!open.isBefore(close)) {
            throw new BadRequestException("Giờ mở cửa phải sớm hơn giờ đóng cửa.");
        }
        facility.setOpenTime(open);
        facility.setCloseTime(close);

        if (req.phone() != null) facility.setPhone(req.phone().trim());
        if (req.messengerUrl() != null) facility.setMessengerUrl(MessengerUrl.normalize(req.messengerUrl()));
        if (req.description() != null) facility.setDescription(req.description().trim());
        if (req.logoUrl() != null && !req.logoUrl().isBlank()) facility.setLogoUrl(req.logoUrl().trim());
        if (req.imageUrl() != null && !req.imageUrl().isBlank()) {
            facility.setImageUrl(req.imageUrl().trim());
        } else if (req.galleryImages() != null && !req.galleryImages().isEmpty()) {
            facility.setImageUrl(req.galleryImages().getFirst());
        }

        if (req.sportType() != null && !req.sportType().isBlank()) {
            facility.setSportType(req.sportType().trim().toLowerCase(Locale.ROOT));
        }
        if (req.status() != null && !req.status().isBlank()) {
            facility.setStatus(normalizeFacilityStatus(req.status()));
        }

        if (req.amenities() != null) {
            Set<String> cleanedAmenities = req.amenities().stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            facility.setAmenitySet(cleanedAmenities);
        }
    }

    private Court createCourtEntity(Long facilityId, CourtUpsertRequest req, int defaultNum) {
        Court court = new Court();
        court.setFacilityId(facilityId);
        court.setName(req.name().trim());
        court.setCourtNumber(req.courtNumber() != null && req.courtNumber() > 0 ? req.courtNumber() : defaultNum);
        court.setCourtType(req.courtType() != null && !req.courtType().isBlank()
                ? req.courtType().trim().toUpperCase(Locale.ROOT) : "STANDARD");
        court.setBasePricePerHour(req.basePricePerHour() != null ? req.basePricePerHour() : BigDecimal.valueOf(100000));
        court.setSurfaceType(req.surfaceType() != null && !req.surfaceType().isBlank()
                ? req.surfaceType().trim() : "Thảm BWF tiêu chuẩn");
        court.setDescription(req.description());
        court.setStatus(req.status() != null && !req.status().isBlank()
                ? req.status().trim().toUpperCase(Locale.ROOT) : "ACTIVE");
        return courtRepository.save(court);
    }

    private void syncGalleryImages(Long facilityId, String coverUrl, List<String> galleryUrls) {
        List<String> merged = new ArrayList<>();
        if (coverUrl != null && !coverUrl.isBlank()) {
            merged.add(coverUrl.trim());
        }
        if (galleryUrls != null) {
            for (String u : galleryUrls) {
                if (u != null && !u.isBlank() && !merged.contains(u.trim())) {
                    merged.add(u.trim());
                }
            }
        }
        if (merged.isEmpty()) return;

        facilityImageRepository.deleteByFacilityId(facilityId);
        int order = 0;
        for (String url : merged) {
            facilityImageRepository.save(new FacilityImage(facilityId, url, null, order++));
        }
    }

    private void recalculateFacilityPriceBounds(Facility facility) {
        List<Court> courts = courtRepository.findByFacilityIdOrderByCourtNumberAscIdAsc(facility.getId());
        List<PriceRule> rules = priceRuleRepository.findAllByFacility(facility.getId());

        List<BigDecimal> hourlyRates = new ArrayList<>();
        for (Court c : courts) {
            if ("ACTIVE".equalsIgnoreCase(c.getStatus()) && c.getBasePricePerHour() != null) {
                hourlyRates.add(c.getBasePricePerHour());
            }
        }
        for (PriceRule r : rules) {
            if ("CASUAL".equalsIgnoreCase(r.getCustomerType()) && r.getPricePerSlot() != null) {
                int slotMins = r.getSlotDurationMinutes() != null && r.getSlotDurationMinutes() > 0
                        ? r.getSlotDurationMinutes() : 60;
                BigDecimal hourly = r.getPricePerSlot()
                        .multiply(BigDecimal.valueOf(60))
                        .divide(BigDecimal.valueOf(slotMins), 2, RoundingMode.HALF_UP);
                hourlyRates.add(hourly);
            }
        }

        if (!hourlyRates.isEmpty()) {
            BigDecimal min = hourlyRates.stream().min(BigDecimal::compareTo).orElse(BigDecimal.valueOf(80000));
            BigDecimal max = hourlyRates.stream().max(BigDecimal::compareTo).orElse(min);
            facility.setMinPrice(min);
            facility.setMaxPrice(max);
            facilityRepository.save(facility);
        }
    }

    private void validatePriceRuleWindow(PriceRuleUpsertRequest req) {
        if (!req.startTime().isBefore(req.endTime())) {
            throw new BadRequestException("Giờ bắt đầu của khung giá phải sớm hơn giờ kết thúc.");
        }
        if (req.effectiveFrom() != null && req.effectiveTo() != null && req.effectiveFrom().isAfter(req.effectiveTo())) {
            throw new BadRequestException("Ngày bắt đầu hiệu lực không được sau ngày kết thúc.");
        }
    }

    private void applyPriceRuleFields(PriceRule rule, PriceRuleUpsertRequest req) {
        rule.setCourtId(req.courtId() != null && req.courtId() > 0 ? req.courtId() : null);
        rule.setName(req.name().trim());

        String dayType = req.dayType() != null && !req.dayType().isBlank()
                ? req.dayType().trim().toUpperCase(Locale.ROOT) : "ALL";
        rule.setDayType(dayType);

        int dow = req.dayOfWeek() != null ? req.dayOfWeek() : 0;
        if ("ALL".equals(dayType) || "WEEKDAY".equals(dayType) || "WEEKEND".equals(dayType)) {
            dow = 0;
        }
        rule.setDayOfWeek(dow);

        String custType = req.customerType() != null && !req.customerType().isBlank()
                ? req.customerType().trim().toUpperCase(Locale.ROOT) : "CASUAL";
        rule.setCustomerType(custType);

        rule.setStartTime(req.startTime());
        rule.setEndTime(req.endTime());
        rule.setPricePerSlot(req.pricePerSlot());
        rule.setSlotDurationMinutes(req.slotDurationMinutes() != null && req.slotDurationMinutes() > 0
                ? req.slotDurationMinutes() : 60);
        rule.setEffectiveFrom(req.effectiveFrom());
        rule.setEffectiveTo(req.effectiveTo());
    }

    private Map<Long, String> getCourtNameMap(Long facilityId) {
        return courtRepository.findByFacilityIdOrderByCourtNumberAscIdAsc(facilityId).stream()
                .collect(Collectors.toMap(Court::getId, Court::getName, (a, b) -> a));
    }

    private String normalizeFacilityStatus(String raw) {
        if (raw == null) return "ACTIVE";
        String upper = raw.trim().toUpperCase(Locale.ROOT);
        if ("PAUSED".equals(upper) || "INACTIVE".equals(upper)) return "INACTIVE";
        if ("MAINTENANCE".equals(upper)) return "MAINTENANCE";
        return "ACTIVE";
    }

    private List<OwnerBookingItemDto> toOwnerBookingDtos(List<Booking> bookings, Map<Long, Facility> facMap) {
        if (bookings.isEmpty()) return List.of();
        Set<Long> customerIds = bookings.stream().map(Booking::getCustomerId).collect(Collectors.toSet());
        Set<Long> courtIds = bookings.stream().map(Booking::getCourtId).collect(Collectors.toSet());

        Map<Long, User> userMap = userRepository.findAllById(customerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<Long, Court> courtMap = courtRepository.findAllById(courtIds).stream()
                .collect(Collectors.toMap(Court::getId, c -> c));

        return bookings.stream().map(b -> {
            Facility f = facMap.get(b.getFacilityId());
            Court c = courtMap.get(b.getCourtId());
            User u = userMap.get(b.getCustomerId());
            return new OwnerBookingItemDto(
                    b.getId(),
                    "SMC-" + String.format("%05d", b.getId()),
                    b.getFacilityId(),
                    f != null ? f.getName() : "Cụm sân #" + b.getFacilityId(),
                    b.getCourtId(),
                    c != null ? c.getName() : "Sân #" + b.getCourtId(),
                    b.getCustomerId(),
                    u != null ? u.getFullName() : "Khách vãng lai",
                    u != null && u.getPhone() != null ? u.getPhone() : "",
                    u != null ? u.getEmail() : "",
                    b.getBookingDate(),
                    b.getStartTime(),
                    b.getEndTime(),
                    b.getTotalAmount(),
                    b.getCurrency(),
                    b.getStatus().name(),
                    b.getNote(),
                    b.getHoldExpiresAt(),
                    b.getCreatedAt()
            );
        }).toList();
    }

    private List<OwnerDashboardDto.HourlyBandOccupancy> buildHourlyBands(List<Booking> bookings, int courtCount, long daysSpan) {
        record BandDef(String label, LocalTime start, LocalTime end) {}
        List<BandDef> defs = List.of(
                new BandDef("05:30 - 09:00 (Sáng sớm)", LocalTime.of(5, 30), LocalTime.of(9, 0)),
                new BandDef("09:00 - 14:00 (Buổi trưa)", LocalTime.of(9, 0), LocalTime.of(14, 0)),
                new BandDef("14:00 - 17:00 (Buổi chiều)", LocalTime.of(14, 0), LocalTime.of(17, 0)),
                new BandDef("17:00 - 20:00 (Giờ vàng tối 1)", LocalTime.of(17, 0), LocalTime.of(20, 0)),
                new BandDef("20:00 - 23:00 (Giờ vàng tối 2)", LocalTime.of(20, 0), LocalTime.of(23, 0))
        );

        List<Booking> paid = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.COMPLETED)
                .toList();

        List<OwnerDashboardDto.HourlyBandOccupancy> result = new ArrayList<>();
        for (BandDef def : defs) {
            double bandDurationHours = Duration.between(def.start(), def.end()).toMinutes() / 60.0;
            double totalCap = Math.max(1.0, bandDurationHours * courtCount * daysSpan);
            double overlapHours = 0.0;
            int count = 0;

            for (Booking b : paid) {
                LocalTime s = b.getStartTime().isAfter(def.start()) ? b.getStartTime() : def.start();
                LocalTime e = b.getEndTime().isBefore(def.end()) ? b.getEndTime() : def.end();
                if (s.isBefore(e)) {
                    overlapHours += Duration.between(s, e).toMinutes() / 60.0;
                    count++;
                }
            }
            double pct = Math.min(100.0, Math.round((overlapHours / totalCap) * 1000.0) / 10.0);
            result.add(new OwnerDashboardDto.HourlyBandOccupancy(def.label(), pct, count));
        }
        return result;
    }
}
