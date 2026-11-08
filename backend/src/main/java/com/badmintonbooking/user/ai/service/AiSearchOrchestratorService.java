package com.badmintonbooking.user.ai.service;

import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.court.repository.PriceRuleRepository;
import java.time.LocalDate;
import java.util.Locale;
import com.badmintonbooking.user.ai.dto.AiRecommendedCourtDto;
import com.badmintonbooking.user.ai.dto.AiSearchRequest;
import com.badmintonbooking.user.ai.dto.AiSearchResponse;
import com.badmintonbooking.user.ai.dto.SearchCriteriaDto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AiSearchOrchestratorService {

    private final LlmClient llmClient;
    private final AiRateLimiterService rateLimiterService;
    private final FacilityRepository facilityRepository;
    private final CourtRepository courtRepository;
    private final PriceRuleRepository priceRuleRepository;

    public AiSearchOrchestratorService(LlmClient llmClient,
                                       AiRateLimiterService rateLimiterService,
                                       FacilityRepository facilityRepository,
                                       CourtRepository courtRepository, PriceRuleRepository priceRuleRepository) {
        this.llmClient = llmClient;
        this.rateLimiterService = rateLimiterService;
        this.facilityRepository = facilityRepository;
        this.courtRepository = courtRepository;
        this.priceRuleRepository = priceRuleRepository;
    }

    public AiSearchResponse orchestrateSearch(AiSearchRequest request, String clientKey) {
        long startTime = System.currentTimeMillis();

        // 1. Rate Limiting Check
        if (!rateLimiterService.allowRequest(clientKey)) {
            throw new RuntimeException("Bạn đã vượt quá giới hạn hỏi AI (tối đa 15 câu/phút). Vui lòng thử lại sau giây lát.");
        }

        // 2. LLM Extraction & Processing
        LlmClient.LlmParseResult parseResult = llmClient.parseMessage(request.getMessage(), request.getCurrentCriteria());
        SearchCriteriaDto criteria = parseResult.criteria;

        // 3. Validate Criteria
        if (!criteria.isValid()) {
            throw new IllegalArgumentException("Khung giờ hoặc khoảng giá tìm kiếm không hợp lệ.");
        }

        // Only return known active facilities. Availability and amenities are not
        // represented by this search, so do not claim those requirements are met.
        List<Facility> matchedFacilities = facilityRepository.findByStatus("ACTIVE");
        List<AiRecommendedCourtDto> recommendations = new ArrayList<>();
        String district = criteria.getDistrict();
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        for (Facility fac : matchedFacilities) {
            if (district != null && !district.isBlank()) {
                String term = district.toLowerCase(Locale.ROOT);
                if ((fac.getDistrict() == null || !fac.getDistrict().toLowerCase(Locale.ROOT).contains(term)) &&
                    (fac.getAddress() == null || !fac.getAddress().toLowerCase(Locale.ROOT).contains(term))) continue;
            }
            if (criteria.getAmenities() != null && !criteria.getAmenities().isEmpty()) continue;
            List<Long> courtIds = courtRepository.findByFacilityIdAndStatus(fac.getId(), "ACTIVE").stream().map(Court::getId).toList();
            if (courtIds.isEmpty()) continue;
            Double minPrice = priceRuleRepository.findByCourtIdIn(courtIds).stream()
                .filter(p -> p.getPricePerSlot() != null && p.getSlotDurationMinutes() != null && p.getSlotDurationMinutes() > 0)
                .filter(p -> (p.getEffectiveFrom() == null || !p.getEffectiveFrom().isAfter(today)) && (p.getEffectiveTo() == null || !p.getEffectiveTo().isBefore(today)))
                .map(p -> p.getPricePerSlot().doubleValue() * 60.0 / p.getSlotDurationMinutes())
                .min(Double::compareTo).orElse(null);
            if (criteria.getMaxPricePerHour() != null && (minPrice == null || minPrice > criteria.getMaxPricePerHour())) continue;
            recommendations.add(new AiRecommendedCourtDto(fac.getId(), fac.getName(), fac.getAddress(), fac.getDistrict(),
                fac.getOpenTime() + " - " + fac.getCloseTime(), null, null, null, minPrice, List.of(),
                "Vui lòng kiểm tra lịch trống và giá theo giờ trước khi đặt."));
            if (recommendations.size() >= 5) break;
        }

        long responseTime = System.currentTimeMillis() - startTime;
        int remainingQuota = rateLimiterService.getRemainingQuota(clientKey);

        return new AiSearchResponse(
                parseResult.reply,
                criteria,
                recommendations,
                remainingQuota,
                responseTime
        );
    }

    public int checkRemainingQuota(String clientKey) {
        return rateLimiterService.getRemainingQuota(clientKey);
    }
}
