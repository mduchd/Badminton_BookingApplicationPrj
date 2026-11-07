package com.badmintonbooking.user.ai;

import com.badmintonbooking.user.ai.dto.SearchCriteriaDto;
import com.badmintonbooking.user.ai.service.LlmClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class LlmClientTest {

    private final LlmClient llmClient = new LlmClient(new ObjectMapper());

    @Test
    @DisplayName("Fallback parser extracts district, time, and price when API key is not configured")
    void fallbackParserWorksWithoutKey() {
        String message = "Tìm sân Cầu Giấy tối nay sau 19h dưới 150k có máy lạnh";
        LlmClient.LlmParseResult result = llmClient.parseMessage(message, null);

        assertNotNull(result);
        assertNotNull(result.criteria);
        assertEquals("Cầu Giấy", result.criteria.getDistrict());
        assertEquals("19:00", result.criteria.getStartTime());
        assertEquals("21:00", result.criteria.getEndTime());
        assertEquals(150000.0, result.criteria.getMaxPricePerHour());
        assertTrue(result.criteria.getAmenities().contains("Máy lạnh"));
        assertTrue(result.reply.contains("SmashCourt AI đã phân tích yêu cầu"));
    }
}
