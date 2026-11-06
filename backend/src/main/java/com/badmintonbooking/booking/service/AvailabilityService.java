package com.badmintonbooking.booking.service;

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

    public AvailabilityService(CourtRepository courtRepository,
                               FacilityRepository facilityRepository,
                               PriceRuleRepository priceRuleRepository,
                               CourtOccupancyRepository occupancyRepository) {
        this.courtRepository = courtRepository;
        this.facilityRepository = facilityRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.occupancyRepository = occupancyRepository;
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
        List<PriceRule> rules = priceRuleRepository.findRulesForCourtAndDay(courtId, dayOfWeek);

        List<TimeSlotDto> slots = new ArrayList<>();
        LocalTime currentStart = openTime;

        while (currentStart.isBefore(closeTime)) {
            LocalTime currentEnd = currentStart.plusHours(1);
            if (currentEnd.isAfter(closeTime)) {
                currentEnd = closeTime;
            }

            OffsetDateTime slotStart = date.atTime(currentStart).atZone(ZONE_VN).toOffsetDateTime();
            OffsetDateTime slotEnd = date.atTime(currentEnd).atZone(ZONE_VN).toOffsetDateTime();

            // Kiểm tra xung đột: newStart < existingEnd && newEnd > existingStart
            CourtOccupancy conflict = findConflict(activeOccupancies, slotStart, slotEnd);

            BigDecimal slotPrice = calculatePriceForInterval(rules, currentStart, currentEnd);

            if (conflict == null) {
                slots.add(new TimeSlotDto(currentStart, currentEnd, slotPrice, true, "AVAILABLE", null));
            } else {
                String slotStatus = mapOccupancyToStatus(conflict.getOccupancyType());
                String reason = conflict.getOccupancyType() == OccupancyType.MAINTENANCE ? "Sân đang bảo trì" : "Sân đã có người giữ/đặt";
                slots.add(new TimeSlotDto(currentStart, currentEnd, slotPrice, false, slotStatus, reason));
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

        Court court = courtRepository.findById(courtId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân với id: " + courtId));

        Facility facility = facilityRepository.findById(court.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cụm sân"));

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

        List<CourtOccupancy> conflicts = occupancyRepository.findActiveOverlapping(courtId, startAt, endAt);
        if (!conflicts.isEmpty()) {
            CourtOccupancy c = conflicts.getFirst();
            String reason = c.getOccupancyType() == OccupancyType.MAINTENANCE ? "Sân đang bảo trì" : "Sân đã có người giữ hoặc đặt";
            return new CheckAvailabilityResponse(courtId, false, BigDecimal.ZERO, reason, OffsetDateTime.now());
        }

        int dayOfWeek = date.getDayOfWeek().getValue();
        List<PriceRule> rules = priceRuleRepository.findRulesForCourtAndDay(courtId, dayOfWeek);
        BigDecimal totalPrice = calculatePriceForInterval(rules, startTime, endTime);

        return new CheckAvailabilityResponse(courtId, true, totalPrice, "Sân còn trống", OffsetDateTime.now());
    }

    public BigDecimal calculatePriceForInterval(List<PriceRule> rules, LocalTime start, LocalTime end) {
        if (rules.isEmpty()) {
            // Mặc định fallback nếu chưa có price_rule
            long durationMinutes = Duration.between(start, end).toMinutes();
            return BigDecimal.valueOf(100000)
                    .multiply(BigDecimal.valueOf(durationMinutes))
                    .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        }

        BigDecimal total = BigDecimal.ZERO;
        LocalTime current = start;

        // Tính theo từng lát 30 phút để áp giá chính xác theo từng khung giờ
        while (current.isBefore(end)) {
            LocalTime next = current.plusMinutes(30);
            if (next.isAfter(end)) {
                next = end;
            }

            LocalTime midPoint = current.plusMinutes(Duration.between(current, next).toMinutes() / 2);
            BigDecimal hourlyRate = BigDecimal.valueOf(100000); // Mặc định

            for (PriceRule r : rules) {
                if (!midPoint.isBefore(r.getStartTime()) && midPoint.isBefore(r.getEndTime())) {
                    hourlyRate = r.getPricePerSlot();
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

    private CourtOccupancy findConflict(List<CourtOccupancy> occupancies, OffsetDateTime start, OffsetDateTime end) {
        for (CourtOccupancy o : occupancies) {
            // Overlap: newStart < existingEnd && newEnd > existingStart
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
