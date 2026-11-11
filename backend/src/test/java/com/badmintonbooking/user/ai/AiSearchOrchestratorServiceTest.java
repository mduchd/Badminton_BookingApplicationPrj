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
    @Test void suggestsAlternativeTimeWithoutCallingItAnExactMatch() {
        var llm = mock(LlmClient.class); var facilities = mock(FacilityRepository.class);
        var courts = mock(CourtRepository.class); var prices = mock(PriceRuleRepository.class);
        var availability = mock(com.badmintonbooking.booking.service.AvailabilityService.class);
        var criteria = new SearchCriteriaDto();
        criteria.setDate(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1).toString());
        criteria.setStartTime("19:00"); criteria.setEndTime("21:00"); criteria.setMaxTotalPrice(250000.0);
        when(llm.parseMessage(anyString(), isNull())).thenReturn(new LlmClient.LlmParseResult(criteria, "test"));
        var facility = new Facility(); facility.setId(5L); facility.setStatus("ACTIVE"); facility.setIsApproved(true);
        var court = new Court(); court.setId(9L); court.setFacilityId(5L);
        when(facilities.findByStatus("ACTIVE")).thenReturn(List.of(facility));
        when(courts.findByFacilityIdInAndStatus(List.of(5L), "ACTIVE")).thenReturn(List.of(court));
        when(availability.checkIntervals(anyList(), any(), any(), any())).thenAnswer(invocation -> {
            boolean free = java.time.LocalTime.of(20, 0).equals(invocation.getArgument(2));
            return java.util.Map.of(9L, new com.badmintonbooking.booking.dto.CheckAvailabilityResponse(9L, free, new BigDecimal("240000"), "test", java.time.OffsetDateTime.now()));
        });
        var result = new AiSearchOrchestratorService(llm, new AiRateLimiterService(), facilities, courts, prices, availability)
                .orchestrateSearch(new AiSearchRequest("tìm sân", null, null), "test");
        assertTrue(result.getRecommendedCourts().isEmpty());
        assertEquals("20:00", result.getAlternatives().get(0).getStartTime());
        assertTrue(result.getAlternatives().get(0).getMatchReason().contains("muộn hơn 60"));
    }
    @Test void excludesOccupiedCourtsAndReturnsCheckedPrice() {
        var llm = mock(LlmClient.class);
        var facilities = mock(FacilityRepository.class);
        var courts = mock(CourtRepository.class);
        var prices = mock(PriceRuleRepository.class);
        var availability = mock(com.badmintonbooking.booking.service.AvailabilityService.class);
        var criteria = new SearchCriteriaDto();
        var date = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
        criteria.setDate(date.toString()); criteria.setStartTime("19:00"); criteria.setEndTime("21:00");
        when(llm.parseMessage(anyString(), isNull())).thenReturn(new LlmClient.LlmParseResult(criteria, "test"));
        var facility = new Facility(); facility.setId(5L); facility.setStatus("ACTIVE"); facility.setIsApproved(true);
        var busy = new Court(); busy.setId(1L); busy.setFacilityId(5L);
        var free = new Court(); free.setId(2L); free.setName("Sân 2"); free.setFacilityId(5L);
        when(facilities.findByStatus("ACTIVE")).thenReturn(List.of(facility));
        when(courts.findByFacilityIdInAndStatus(List.of(5L), "ACTIVE")).thenReturn(List.of(busy, free));
        var start = java.time.LocalTime.of(19, 0); var end = java.time.LocalTime.of(21, 0);
        var checked = java.time.OffsetDateTime.now();
        when(availability.checkIntervals(anyList(), eq(date), eq(start), eq(end))).thenReturn(java.util.Map.of(
                1L, new com.badmintonbooking.booking.dto.CheckAvailabilityResponse(1L, false, BigDecimal.ZERO, "bận", checked),
                2L, new com.badmintonbooking.booking.dto.CheckAvailabilityResponse(2L, true, new BigDecimal("240000"), "trống", checked)));
        var result = new AiSearchOrchestratorService(llm, new AiRateLimiterService(), facilities, courts, prices, availability)
                .orchestrateSearch(new AiSearchRequest("tìm sân", null, null), "test");
        assertEquals(2L, result.getRecommendedCourts().get(0).getCourtId());
        assertEquals(new BigDecimal("240000"), result.getRecommendedCourts().get(0).getTotalPrice());
    }
    @Test void usesDatabasePricingAndDoesNotInventDetails() {
        LlmClient llm = mock(LlmClient.class);
        AiRateLimiterService rate = new AiRateLimiterService();
        FacilityRepository facilities = mock(FacilityRepository.class);
        CourtRepository courts = mock(CourtRepository.class);
        PriceRuleRepository prices = mock(PriceRuleRepository.class);
        SearchCriteriaDto criteria = new SearchCriteriaDto();
        criteria.setDistrict(null);
        when(llm.parseMessage(anyString(), isNull())).thenReturn(new LlmClient.LlmParseResult(criteria, "Kết quả"));
        Facility fac = new Facility(); fac.setId(5L); fac.setStatus("ACTIVE"); fac.setIsApproved(true); fac.setName("Sân thật"); fac.setDistrict("Cầu Giấy"); fac.setAddress("Cầu Giấy");
        Court court = new Court(); court.setId(9L); court.setFacilityId(5L);
        PriceRule price = new PriceRule(); price.setPricePerSlot(new BigDecimal("70000")); price.setSlotDurationMinutes(30);
        when(facilities.findByStatus("ACTIVE")).thenReturn(List.of(fac));
        when(courts.findByFacilityIdInAndStatus(List.of(5L), "ACTIVE")).thenReturn(List.of(court));
        when(prices.findByCourtIdIn(List.of(9L))).thenReturn(List.of(price));
        var service = new AiSearchOrchestratorService(llm, rate, facilities, courts, prices, mock(com.badmintonbooking.booking.service.AvailabilityService.class));
        var result = service.orchestrateSearch(new AiSearchRequest("Tìm sân", null, null), "test");
        var item = result.getRecommendedCourts().get(0);
        assertEquals(140000, item.getMinPricePerHour());
        assertNull(item.getRating()); assertNull(item.getImageUrl()); assertTrue(item.getAmenities().isEmpty());
        criteria.setDistrict("Hà Đông");
        assertTrue(service.orchestrateSearch(new AiSearchRequest("Tìm sân", null, null), "test").getRecommendedCourts().isEmpty());
    }
}
