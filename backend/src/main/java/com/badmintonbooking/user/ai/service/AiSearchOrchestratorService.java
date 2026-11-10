package com.badmintonbooking.user.ai.service;

import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.court.repository.PriceRuleRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Duration;
import com.badmintonbooking.booking.service.AvailabilityService;
import java.util.Locale;
import com.badmintonbooking.user.ai.dto.AiRecommendedCourtDto;
import com.badmintonbooking.user.ai.dto.AiSearchRequest;
import com.badmintonbooking.user.ai.dto.AiSearchResponse;
import com.badmintonbooking.user.ai.dto.SearchCriteriaDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class AiSearchOrchestratorService {

    private final LlmClient llmClient;
    private final AiRateLimiterService rateLimiterService;
    private final FacilityRepository facilityRepository;
    private final CourtRepository courtRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final AvailabilityService availabilityService;

    public AiSearchOrchestratorService(LlmClient llmClient,
                                       AiRateLimiterService rateLimiterService,
                                       FacilityRepository facilityRepository,
                                       CourtRepository courtRepository, PriceRuleRepository priceRuleRepository,
                                       AvailabilityService availabilityService) {
        this.llmClient = llmClient;
        this.rateLimiterService = rateLimiterService;
        this.facilityRepository = facilityRepository;
        this.courtRepository = courtRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.availabilityService = availabilityService;
    }

    public AiSearchResponse orchestrateSearch(AiSearchRequest request, String clientKey) {
        long startTime = System.currentTimeMillis();
        if (request.getCurrentCriteria() != null && !request.getCurrentCriteria().isValid()) {
            throw new com.badmintonbooking.common.exception.BadRequestException("Tiêu chí tìm kiếm không hợp lệ.");
        }

        // 1. Rate Limiting Check
        if (!rateLimiterService.allowRequest(clientKey)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "Bạn đã vượt quá giới hạn hỏi AI. Vui lòng thử lại sau.");
        }

        // 2. LLM Extraction & Processing
        LlmClient.LlmParseResult parseResult = llmClient.parseMessage(request.getMessage(), request.getCurrentCriteria());
        SearchCriteriaDto criteria = parseResult.criteria;
        if ("INFO".equals(parseResult.intent)) {
            var response = new AiSearchResponse(parseResult.reply, criteria, List.of(), rateLimiterService.getRemainingQuota(clientKey), System.currentTimeMillis() - startTime);
            response.setStatus("INFO_ONLY");
            return response;
        }

        // 3. Validate Criteria
        if (!criteria.isValid()) {
            throw new com.badmintonbooking.common.exception.BadRequestException("Ngày, khung giờ hoặc khoảng giá tìm kiếm không hợp lệ.");
        }

        // Lọc theo dữ liệu đã công bố. Giờ trống được kiểm tra riêng khi đặt sân.
        List<Facility> matchedFacilities = facilityRepository.findByStatus("ACTIVE").stream().filter(f -> matches(f, criteria)).toList();
        List<AiRecommendedCourtDto> recommendations = new ArrayList<>();
        String district = criteria.getDistrict();
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        boolean hasInterval = criteria.getDate() != null && criteria.getStartTime() != null && criteria.getEndTime() != null;
        LocalDate requestedDate = hasInterval ? LocalDate.parse(criteria.getDate()) : null;
        LocalTime start = hasInterval ? LocalTime.parse(criteria.getStartTime()) : null;
        LocalTime end = hasInterval ? LocalTime.parse(criteria.getEndTime()) : null;
        boolean past = hasInterval && !requestedDate.atTime(start).isAfter(java.time.LocalDateTime.now(AvailabilityService.ZONE_VN));
        var courtsByFacility = courtRepository.findByFacilityIdInAndStatus(matchedFacilities.stream().map(Facility::getId).toList(), "ACTIVE")
                .stream().collect(java.util.stream.Collectors.groupingBy(Court::getFacilityId));
        var allCourtIds = courtsByFacility.values().stream().flatMap(List::stream).map(Court::getId).toList();
        var checks = hasInterval && !past ? availabilityService.checkIntervals(allCourtIds, requestedDate, start, end) : java.util.Map.<Long, com.badmintonbooking.booking.dto.CheckAvailabilityResponse>of();
        for (Facility fac : matchedFacilities) {
            if (past) break;
            if (!Boolean.TRUE.equals(fac.getIsApproved())) continue;
            if (criteria.getSportType() != null && !criteria.getSportType().equalsIgnoreCase(fac.getSportType())) continue;
            List<String> amenities = fac.getAmenities();
            List<Court> activeCourts = courtsByFacility.getOrDefault(fac.getId(), List.of());
            List<Long> courtIds = activeCourts.stream().map(Court::getId).toList();
            if (courtIds.isEmpty()) continue;
            if (hasInterval) {
                for (Court court : activeCourts) {
                    var check = checks.get(court.getId());
                    if (check == null || !check.isAvailable()) continue;
                    double hourly = check.calculatedPrice().doubleValue() * 60 / Duration.between(start, end).toMinutes();
                    if (criteria.getMaxPricePerHour() != null && hourly > criteria.getMaxPricePerHour()) continue;
                    if (criteria.getMaxTotalPrice() != null && check.calculatedPrice().doubleValue() > criteria.getMaxTotalPrice()) continue;
                    var item = new AiRecommendedCourtDto(fac.getId(), fac.getName(), fac.getAddress(), fac.getDistrict(),
                            fac.getOpenTime() + " - " + fac.getCloseTime(), fac.getReviewCount() > 0 ? fac.getRating().doubleValue() : null,
                            fac.getReviewCount(), fac.getImageUrl(), hourly, amenities,
                            "Đã kiểm tra lịch; giá và tình trạng sẽ được kiểm tra lại khi đặt.");
                    item.setCourtId(court.getId()); item.setCourtName(court.getName());
                    item.setDate(criteria.getDate()); item.setStartTime(criteria.getStartTime()); item.setEndTime(criteria.getEndTime());
                    item.setTotalPrice(check.calculatedPrice()); item.setCheckedAt(check.checkedAt());
                    recommendations.add(item);
                }
                continue;
            }
            Double minPrice = priceRuleRepository.findByCourtIdIn(courtIds).stream()
                .filter(p -> p.getPricePerSlot() != null && p.getSlotDurationMinutes() != null && p.getSlotDurationMinutes() > 0)
                .filter(p -> (p.getEffectiveFrom() == null || !p.getEffectiveFrom().isAfter(today)) && (p.getEffectiveTo() == null || !p.getEffectiveTo().isBefore(today)))
                .map(p -> p.getPricePerSlot().doubleValue() * 60.0 / p.getSlotDurationMinutes())
                .min(Double::compareTo).orElse(null);
            if (criteria.getMaxPricePerHour() != null && (minPrice == null || minPrice > criteria.getMaxPricePerHour())) continue;
            recommendations.add(new AiRecommendedCourtDto(fac.getId(), fac.getName(), fac.getAddress(), fac.getDistrict(),
                fac.getOpenTime() + " - " + fac.getCloseTime(), fac.getReviewCount() > 0 ? fac.getRating().doubleValue() : null,
                fac.getReviewCount(), fac.getImageUrl(), minPrice, amenities,
                "Vui lòng kiểm tra lịch trống và giá theo giờ trước khi đặt."));
        }

        recommendations.sort(java.util.Comparator.comparing(AiRecommendedCourtDto::getMinPricePerHour,
                java.util.Comparator.nullsLast(Double::compareTo)).thenComparing(AiRecommendedCourtDto::getFacilityId)
                .thenComparing(AiRecommendedCourtDto::getCourtId, java.util.Comparator.nullsLast(Long::compareTo)));
        recommendations = recommendations.stream().limit(5).toList();

        long responseTime = System.currentTimeMillis() - startTime;
        int remainingQuota = rateLimiterService.getRemainingQuota(clientKey);

        var response = new AiSearchResponse(
                hasInterval ? (past ? "Thời gian yêu cầu đã qua. Vui lòng chọn thời gian khác." :
                        recommendations.isEmpty() ? "Không tìm thấy sân trống phù hợp." : "Các sân sau còn trống tại thời điểm kiểm tra.") :
                        "Danh sách dưới đây là thông tin sân, chưa xác nhận lịch trống. Vui lòng cung cấp ngày và giờ bắt đầu, kết thúc để kiểm tra.",
                criteria,
                recommendations,
                remainingQuota,
                responseTime
        );
        if (hasInterval && !past && recommendations.isEmpty() && !allCourtIds.isEmpty()) {
            var alternatives = new ArrayList<AiRecommendedCourtDto>();
            for (int shift : new int[]{-60, 60, -120, 120}) {
                int shiftedStart = start.getHour() * 60 + start.getMinute() + shift;
                int shiftedEnd = end.getHour() * 60 + end.getMinute() + shift;
                if (shiftedStart < 0 || shiftedEnd >= 1440) continue;
                var from = LocalTime.of(shiftedStart / 60, shiftedStart % 60);
                var to = LocalTime.of(shiftedEnd / 60, shiftedEnd % 60);
                var nearby = availabilityService.checkIntervals(allCourtIds, requestedDate, from, to);
                for (Facility facility : matchedFacilities) {
                    for (Court court : courtsByFacility.getOrDefault(facility.getId(), List.of())) {
                        var check = nearby.get(court.getId());
                        if (check == null || !check.isAvailable()) continue;
                        double hourly = check.calculatedPrice().doubleValue() * 60 / Duration.between(from, to).toMinutes();
                        if (criteria.getMaxPricePerHour() != null && hourly > criteria.getMaxPricePerHour()) continue;
                        if (criteria.getMaxTotalPrice() != null && check.calculatedPrice().doubleValue() > criteria.getMaxTotalPrice()) continue;
                        var item = new AiRecommendedCourtDto(facility.getId(), facility.getName(), facility.getAddress(), facility.getDistrict(),
                                facility.getOpenTime() + " - " + facility.getCloseTime(), null, facility.getReviewCount(), facility.getImageUrl(), hourly,
                                facility.getAmenities(), "Giờ khác yêu cầu: " + (shift < 0 ? "sớm hơn " : "muộn hơn ") + Math.abs(shift) + " phút. Cần xác nhận lại trước khi đặt.");
                        item.setCourtId(court.getId()); item.setCourtName(court.getName()); item.setDate(requestedDate.toString());
                        item.setStartTime(from.toString()); item.setEndTime(to.toString()); item.setTotalPrice(check.calculatedPrice()); item.setCheckedAt(check.checkedAt());
                        alternatives.add(item);
                        if (alternatives.size() >= 5) break;
                    }
                    if (alternatives.size() >= 5) break;
                }
                if (alternatives.size() >= 5) break;
            }
            response.setAlternatives(alternatives);
            if (!alternatives.isEmpty()) response.setReply("Không có sân trống đúng yêu cầu. Các lựa chọn dưới đây có giờ sớm hoặc muộn hơn; vui lòng kiểm tra ngày giờ trước khi chọn.");
        }
        return response;
    }

    public int checkRemainingQuota(String clientKey) {
        return rateLimiterService.getRemainingQuota(clientKey);
    }

    private static String normalize(String value) {
        if (value == null) return "";
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replace('đ', 'd').trim().replaceAll("\\s+", " ");
    }

    private boolean matches(Facility facility, SearchCriteriaDto criteria) {
        if (!Boolean.TRUE.equals(facility.getIsApproved())) return false;
        if (criteria.getSportType() != null && !criteria.getSportType().equalsIgnoreCase(facility.getSportType())) return false;
        if (criteria.getCity() != null && !normalize(facility.getCity()).contains(normalize(criteria.getCity()))) return false;
        if (criteria.getDistrict() != null && !normalize(facility.getDistrict()).contains(normalize(criteria.getDistrict()))
                && !normalize(facility.getAddress()).contains(normalize(criteria.getDistrict()))) return false;
        return criteria.getAmenities() == null || criteria.getAmenities().stream().allMatch(requested ->
                facility.getAmenities().stream().anyMatch(actual -> normalize(actual).equals(normalize(requested))));
    }
}
