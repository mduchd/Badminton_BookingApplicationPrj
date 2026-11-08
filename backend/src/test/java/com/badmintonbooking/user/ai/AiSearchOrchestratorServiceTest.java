package com.badmintonbooking.user.ai;

import com.badmintonbooking.user.ai.dto.*;
import com.badmintonbooking.user.ai.service.*;
import com.badmintonbooking.court.entity.*;
import com.badmintonbooking.court.repository.*;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiSearchOrchestratorServiceTest {
    @Test void usesDatabasePricingAndDoesNotInventDetails() {
        LlmClient llm = mock(LlmClient.class);
        AiRateLimiterService rate = new AiRateLimiterService();
        FacilityRepository facilities = mock(FacilityRepository.class);
        CourtRepository courts = mock(CourtRepository.class);
        PriceRuleRepository prices = mock(PriceRuleRepository.class);
        SearchCriteriaDto criteria = new SearchCriteriaDto();
        criteria.setDistrict(null);
        when(llm.parseMessage(anyString(), isNull())).thenReturn(new LlmClient.LlmParseResult(criteria, "Kết quả"));
        Facility fac = new Facility(); fac.setId(5L); fac.setName("Sân thật"); fac.setDistrict("Cầu Giấy"); fac.setAddress("Cầu Giấy");
        Court court = new Court(); court.setId(9L);
        PriceRule price = new PriceRule(); price.setPricePerSlot(new BigDecimal("70000")); price.setSlotDurationMinutes(30);
        when(facilities.findByStatus("ACTIVE")).thenReturn(List.of(fac));
        when(courts.findByFacilityIdAndStatus(5L, "ACTIVE")).thenReturn(List.of(court));
        when(prices.findByCourtIdIn(List.of(9L))).thenReturn(List.of(price));
        var service = new AiSearchOrchestratorService(llm, rate, facilities, courts, prices);
        var result = service.orchestrateSearch(new AiSearchRequest("Tìm sân", null, null), "test");
        var item = result.getRecommendedCourts().get(0);
        assertEquals(140000, item.getMinPricePerHour());
        assertNull(item.getRating()); assertNull(item.getImageUrl()); assertTrue(item.getAmenities().isEmpty());
        criteria.setDistrict("Hà Đông");
        assertTrue(service.orchestrateSearch(new AiSearchRequest("Tìm sân", null, null), "test").getRecommendedCourts().isEmpty());
    }
}
