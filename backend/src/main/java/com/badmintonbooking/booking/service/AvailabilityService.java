package com.badmintonbooking.booking.service;

import com.badmintonbooking.admin.service.SystemSettingService;
import com.badmintonbooking.booking.dto.CheckAvailabilityResponse;
import com.badmintonbooking.booking.dto.CourtAvailabilityResponse;
import com.badmintonbooking.booking.dto.TimeSlotDto;
import com.badmintonbooking.booking.entity.CourtOccupancy;
import com.badmintonbooking.booking.enums.OccupancyType;
import com.badmintonbooking.booking.repository.CourtOccupancyRepository;
import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.common.exception.ResourceNotFoundException;
import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.entity.PriceRule;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.court.repository.PriceRuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class AvailabilityService {

    public static final ZoneId ZONE_VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private final CourtRepository courtRepository;
    private final FacilityRepository facilityRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final CourtOccupancyRepository occupancyRepository;
    private SystemSettingService systemSettingService;

    public AvailabilityService(CourtRepository courtRepository,
                               FacilityRepository facilityRepository,
                               PriceRuleRepository priceRuleRepository,
                               CourtOccupancyRepository occupancyRepository) {
        this.courtRepository = courtRepository;
        this.facilityRepository = facilityRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.occupancyRepository = occupancyRepository;
    }

    @Autowired(required = false)
    public void setSystemSettingService(SystemSettingService systemSettingService) {
        this.systemSettingService = systemSettingService;
    }

    public CourtAvailabilityResponse getCourtAvailability(Long courtId, LocalDate date) {
        Court court = courtRepository.findById(courtId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân với id: " + courtId));

        Facility facility = facilityRepository.findById(court.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cụm sân"));

        LocalTime openTime = facility.getOpenTime();
        LocalTime closeTime = facility.getCloseTime();

        OffsetDateTime startOfDay = date.atTime(openTime).atZone(ZONE_VN).toOffsetDateTime();
        OffsetDateTime endOfDay = date.atTime(closeTime).atZone(ZONE_VN).toOffsetDateTime();

        List<CourtOccupancy> activeOccupancies = occupancyRepository.findActiveForCourtInDateRange(courtId, startOfDay, endOfDay);
        int dayOfWeek = date.getDayOfWeek().getValue(); // 1 = Mon ... 7 = Sun
        List<PriceRule> rules = effectiveRules(priceRuleRepository.findRulesForCourtAndDay(courtId, dayOfWeek), date);
        BigDecimal fallbackRate = court.getPricePerHour();

        boolean facilityNotActive = !"ACTIVE".equalsIgnoreCase(facility.getStatus()) || !Boolean.TRUE.equals(facility.getIsApproved());
        boolean courtNotActive = !"ACTIVE".equalsIgnoreCase(court.getStatus());
        boolean isSystemMaintenance = systemSettingService != null && systemSettingService.isMaintenanceMode();

        List<TimeSlotDto> slots = new ArrayList<>();
        LocalTime currentStart = openTime;

        while (currentStart.isBefore(closeTime)) {
            LocalTime currentEnd = Duration.between(currentStart, closeTime).compareTo(Duration.ofHours(1)) <= 0
                    ? closeTime : currentStart.plusHours(1);

            OffsetDateTime slotStart = date.atTime(currentStart).atZone(ZONE_VN).toOffsetDateTime();
            OffsetDateTime slotEnd = date.atTime(currentEnd).atZone(ZONE_VN).toOffsetDateTime();

            BigDecimal slotPrice = calculatePriceForInterval(rules, currentStart, currentEnd, fallbackRate);

            if (isSystemMaintenance) {
                slots.add(new TimeSlotDto(currentStart, currentEnd, slotPrice, false, "MAINTENANCE", "Hệ thống đang bảo trì"));
            } else if (facilityNotActive) {
                slots.add(new TimeSlotDto(currentStart, currentEnd, slotPrice, false, "PAUSED", "Cụm sân đang tạm ngừng hoạt động"));
            } else if (courtNotActive) {
                slots.add(new TimeSlotDto(currentStart, currentEnd, slotPrice, false, "MAINTENANCE", "Sân đang bảo trì"));
            } else {
                CourtOccupancy conflict = findConflict(activeOccupancies, slotStart, slotEnd);
                if (conflict == null) {
                    slots.add(new TimeSlotDto(currentStart, currentEnd, slotPrice, true, "AVAILABLE", null));
                } else {
                    String slotStatus = mapOccupancyToStatus(conflict.getOccupancyType());
                    String reason = conflict.getOccupancyType() == OccupancyType.MAINTENANCE
                            ? (conflict.getNote() != null && !conflict.getNote().isBlank()
                                ? "Sân bảo trì: " + conflict.getNote()
                                : "Sân đang bảo trì")
                            : "Sân đã có người giữ/đặt";
                    slots.add(new TimeSlotDto(currentStart, currentEnd, slotPrice, false, slotStatus, reason));
                }
            }

            currentStart = currentEnd;
        }

        return new CourtAvailabilityResponse(
                court.getId(),
                court.getName(),
                facility.getId(),
                facility.getName(),
                date,
                openTime,
                closeTime,
                slots
        );
    }

    public CheckAvailabilityResponse checkIntervalAvailability(Long courtId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        if (!startTime.isBefore(endTime)) {
            throw new BadRequestException("Giờ bắt đầu phải trước giờ kết thúc!");
        }

        if (!date.atTime(startTime).isAfter(LocalDateTime.now(ZONE_VN))) {
            return new CheckAvailabilityResponse(courtId, false, BigDecimal.ZERO, "Khung giờ đã bắt đầu hoặc đã qua", OffsetDateTime.now());
        }

        if (systemSettingService != null && systemSettingService.isMaintenanceMode()) {
            return new CheckAvailabilityResponse(courtId, false, BigDecimal.ZERO, "Hệ thống đang trong chế độ bảo trì định kỳ.", OffsetDateTime.now());
        }

        Court court = courtRepository.findById(courtId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân với id: " + courtId));

        Facility facility = facilityRepository.findById(court.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cụm sân"));

        return evaluateInterval(court, facility, date, startTime, endTime,
                () -> occupancyRepository.findActiveOverlapping(courtId,
                        date.atTime(startTime).atZone(ZONE_VN).toOffsetDateTime(),
                        date.atTime(endTime).atZone(ZONE_VN).toOffsetDateTime()),
                () -> priceRuleRepository.findRulesForCourtAndDay(courtId, date.getDayOfWeek().getValue()));
    }

    public java.util.Map<Long, CheckAvailabilityResponse> checkIntervals(List<Long> courtIds, LocalDate date, LocalTime start, LocalTime end) {
        if (!start.isBefore(end)) throw new BadRequestException("Giờ bắt đầu phải trước giờ kết thúc!");
        if (courtIds.isEmpty()) return java.util.Map.of();
        if (systemSettingService != null && systemSettingService.isMaintenanceMode()) {
            var blocked = new java.util.HashMap<Long, CheckAvailabilityResponse>();
            for (Long id : courtIds) blocked.put(id, new CheckAvailabilityResponse(id, false, BigDecimal.ZERO, "Hệ thống đang bảo trì", OffsetDateTime.now()));
            return blocked;
        }
        var courts = courtRepository.findAllById(courtIds);
        var facilityIds = courts.stream().map(Court::getFacilityId).distinct().toList();
        var facilities = facilityRepository.findAllById(facilityIds).stream().collect(java.util.stream.Collectors.toMap(Facility::getId, f -> f));
        var conflicts = occupancyRepository.findActiveOverlappingBatch(courtIds,
                date.atTime(start).atZone(ZONE_VN).toOffsetDateTime(), date.atTime(end).atZone(ZONE_VN).toOffsetDateTime());
        var rules = facilityIds.isEmpty() ? List.<PriceRule>of() : priceRuleRepository.findRulesForCourtsAndDay(courtIds, facilityIds, date.getDayOfWeek().getValue());
        var result = new java.util.HashMap<Long, CheckAvailabilityResponse>();
        for (Court court : courts) {
            var facility = facilities.get(court.getFacilityId());
            if (facility == null) continue;
            result.put(court.getId(), evaluateInterval(court, facility, date, start, end,
                    () -> conflicts.stream().filter(o -> o.getCourtId().equals(court.getId())).toList(),
                    () -> rules.stream().filter(r -> court.getId().equals(r.getCourtId())
                            || (r.getCourtId() == null && facility.getId().equals(r.getFacilityId()))).toList()));
        }
        return result;
    }

    private CheckAvailabilityResponse evaluateInterval(Court court, Facility facility, LocalDate date, LocalTime startTime, LocalTime endTime,
            java.util.function.Supplier<List<CourtOccupancy>> conflictsSupplier, java.util.function.Supplier<List<PriceRule>> rulesSupplier) {
        Long courtId = court.getId();
        if (!date.atTime(startTime).isAfter(LocalDateTime.now(ZONE_VN))) return new CheckAvailabilityResponse(courtId, false, BigDecimal.ZERO, "Khung giờ đã qua", OffsetDateTime.now());
        if (!"ACTIVE".equalsIgnoreCase(facility.getStatus()) || !Boolean.TRUE.equals(facility.getIsApproved())) {
            return new CheckAvailabilityResponse(
                    courtId,
                    false,
                    BigDecimal.ZERO,
                    "Cụm sân \"" + facility.getName() + "\" đang tạm ngưng hoạt động hoặc chưa được phê duyệt.",
                    OffsetDateTime.now()
            );
        }

        if (!"ACTIVE".equalsIgnoreCase(court.getStatus())) {
            return new CheckAvailabilityResponse(
                    courtId,
                    false,
                    BigDecimal.ZERO,
                    "Sân con \"" + court.getName() + "\" đang bảo trì hoặc tạm ngưng hoạt động.",
                    OffsetDateTime.now()
            );
        }

        if (startTime.isBefore(facility.getOpenTime()) || endTime.isAfter(facility.getCloseTime())) {
            return new CheckAvailabilityResponse(
                    courtId,
                    false,
                    BigDecimal.ZERO,
                    "Khung giờ nằm ngoài thời gian hoạt động của sân (" + facility.getOpenTime() + " - " + facility.getCloseTime() + ")",
                    OffsetDateTime.now()
            );
        }

        OffsetDateTime startAt = date.atTime(startTime).atZone(ZONE_VN).toOffsetDateTime();
        OffsetDateTime endAt = date.atTime(endTime).atZone(ZONE_VN).toOffsetDateTime();

        List<CourtOccupancy> conflicts = conflictsSupplier.get();
        if (!conflicts.isEmpty()) {
            CourtOccupancy c = conflicts.getFirst();
            String reason = c.getOccupancyType() == OccupancyType.MAINTENANCE
                    ? (c.getNote() != null && !c.getNote().isBlank() ? "Sân bảo trì: " + c.getNote() : "Sân đang bảo trì")
                    : "Sân đã có người giữ hoặc đặt";
            return new CheckAvailabilityResponse(courtId, false, BigDecimal.ZERO, reason, OffsetDateTime.now());
        }

        int dayOfWeek = date.getDayOfWeek().getValue();
        List<PriceRule> rules = effectiveRules(rulesSupplier.get(), date);
        BigDecimal totalPrice = calculatePriceForInterval(rules, startTime, endTime, court.getPricePerHour());

        return new CheckAvailabilityResponse(courtId, true, totalPrice, "Sân còn trống", OffsetDateTime.now());
    }

    public BigDecimal calculatePriceForInterval(List<PriceRule> rules, LocalTime start, LocalTime end) {
        return calculatePriceForInterval(rules, start, end, BigDecimal.valueOf(100000));
    }

    public BigDecimal calculatePriceForInterval(List<PriceRule> rules, LocalTime start, LocalTime end, BigDecimal defaultHourlyRate) {
        BigDecimal fallbackHourly = defaultHourlyRate != null ? defaultHourlyRate : BigDecimal.valueOf(100000);
        if (rules.isEmpty()) {
            long durationMinutes = Duration.between(start, end).toMinutes();
            return fallbackHourly
                    .multiply(BigDecimal.valueOf(durationMinutes))
                    .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        }

        BigDecimal total = BigDecimal.ZERO;
        LocalTime current = start;

        while (current.isBefore(end)) {
            LocalTime next = end;
            for (PriceRule rule : rules) {
                if (rule.getStartTime().isAfter(current) && rule.getStartTime().isBefore(next)) next = rule.getStartTime();
                if (rule.getEndTime().isAfter(current) && rule.getEndTime().isBefore(next)) next = rule.getEndTime();
            }
            BigDecimal hourlyRate = fallbackHourly;

            for (PriceRule r : rules) {
                if (!current.isBefore(r.getStartTime()) && current.isBefore(r.getEndTime())) {
                    int slotMins = r.getSlotDurationMinutes() != null && r.getSlotDurationMinutes() > 0
                            ? r.getSlotDurationMinutes() : 60;
                    hourlyRate = r.getPricePerSlot()
                            .multiply(BigDecimal.valueOf(60))
                            .divide(BigDecimal.valueOf(slotMins), 2, RoundingMode.HALF_UP);
                    break;
                }
            }

            long chunkMinutes = Duration.between(current, next).toMinutes();
            BigDecimal chunkPrice = hourlyRate.multiply(BigDecimal.valueOf(chunkMinutes))
                    .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);

            total = total.add(chunkPrice);
            current = next;
        }

        return total;
    }

    private List<PriceRule> effectiveRules(List<PriceRule> rules, LocalDate date) {
        return rules.stream()
                .filter(rule -> (rule.getEffectiveFrom() == null || !date.isBefore(rule.getEffectiveFrom()))
                        && (rule.getEffectiveTo() == null || !date.isAfter(rule.getEffectiveTo())))
                .toList();
    }

    private CourtOccupancy findConflict(List<CourtOccupancy> occupancies, OffsetDateTime start, OffsetDateTime end) {
        for (CourtOccupancy o : occupancies) {
            if (start.isBefore(o.getEndAt()) && end.isAfter(o.getStartAt())) {
                return o;
            }
        }
        return null;
    }

    private String mapOccupancyToStatus(OccupancyType type) {
        return switch (type) {
            case HOLD -> "HELD";
            case BOOKING -> "BOOKED";
            case MAINTENANCE -> "MAINTENANCE";
        };
    }
}
