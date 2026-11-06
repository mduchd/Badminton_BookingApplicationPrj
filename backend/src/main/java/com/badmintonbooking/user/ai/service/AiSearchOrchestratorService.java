package com.badmintonbooking.user.ai.service;

import com.badmintonbooking.court.model.Court;
import com.badmintonbooking.court.model.Facility;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.user.ai.dto.AiRecommendedCourtDto;
import com.badmintonbooking.user.ai.dto.AiSearchRequest;
import com.badmintonbooking.user.ai.dto.AiSearchResponse;
import com.badmintonbooking.user.ai.dto.SearchCriteriaDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class AiSearchOrchestratorService {

    private final LlmClient llmClient;
    private final AiRateLimiterService rateLimiterService;
    private final FacilityRepository facilityRepository;
    private final CourtRepository courtRepository;

    public AiSearchOrchestratorService(LlmClient llmClient,
                                       AiRateLimiterService rateLimiterService,
                                       FacilityRepository facilityRepository,
                                       CourtRepository courtRepository) {
        this.llmClient = llmClient;
        this.rateLimiterService = rateLimiterService;
        this.facilityRepository = facilityRepository;
        this.courtRepository = courtRepository;
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

        // 4. Query TV2/TV3 Real Data from FacilityRepository
        List<Facility> matchedFacilities = facilityRepository.searchActiveFacilities(
                criteria.getDistrict(),
                criteria.getSportType()
        );

        if (matchedFacilities.isEmpty()) {
            matchedFacilities = facilityRepository.findByStatus("ACTIVE");
        }

        // 5. Build Recommendations
        List<AiRecommendedCourtDto> recommendations = new ArrayList<>();
        for (Facility fac : matchedFacilities) {
            List<Court> courts = courtRepository.findByFacilityId(fac.getId());
            double minPrice = courts.stream()
                    .map(Court::getPricePerHour)
                    .map(BigDecimal::doubleValue)
                    .min(Double::compareTo)
                    .orElse(100000.0);

            // Filter by max price if requested
            if (criteria.getMaxPricePerHour() != null && minPrice > criteria.getMaxPricePerHour()) {
                continue;
            }

            // Build dynamic match reason
            StringBuilder reason = new StringBuilder();
            if (criteria.getDistrict() != null && fac.getDistrict().toLowerCase().contains(criteria.getDistrict().toLowerCase())) {
                reason.append("Nằm ngay khu vực ").append(fac.getDistrict()).append(". ");
            }
            if (fac.getRating() != null && fac.getRating().doubleValue() >= 4.8) {
                reason.append("Đạt đánh giá xuất sắc ").append(fac.getRating()).append("★. ");
            }
            reason.append("Giá chỉ từ ").append(String.format("%,.0f", minPrice)).append(" đ/h.");

            AiRecommendedCourtDto dto = new AiRecommendedCourtDto(
                    fac.getId(),
                    fac.getName(),
                    fac.getAddress(),
                    fac.getDistrict(),
                    fac.getOpenTime() + " - " + fac.getCloseTime(),
                    fac.getRating() != null ? fac.getRating().doubleValue() : 4.8,
                    fac.getReviewCount() != null ? fac.getReviewCount() : 100,
                    fac.getImageUrl(),
                    minPrice,
                    fac.getAmenities(),
                    reason.toString()
            );

            recommendations.add(dto);
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
