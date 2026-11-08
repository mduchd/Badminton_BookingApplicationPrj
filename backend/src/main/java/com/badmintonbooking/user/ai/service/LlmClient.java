package com.badmintonbooking.user.ai.service;

import com.badmintonbooking.user.ai.dto.SearchCriteriaDto;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class LlmClient {

    private static final Logger log = LoggerFactory.getLogger(LlmClient.class);

    @Value("${deepseek.api-key:}")
    private String deepseekApiKey;

    @Value("${deepseek.base-url:https://api.deepseek.com}")
    private String deepseekBaseUrl;

    @Value("${deepseek.model:deepseek-chat}")
    private String deepseekModel;

    @Value("${deepseek.timeout-seconds:12}")
    private int timeoutSeconds;

    private final ObjectMapper objectMapper;
    private RestClient restClient;

    public LlmClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public static class LlmParseResult {
        public final SearchCriteriaDto criteria;
        public final String reply;

        public LlmParseResult(SearchCriteriaDto criteria, String reply) {
            this.criteria = criteria;
            this.reply = reply;
        }
    }

    public LlmParseResult parseMessage(String userMessage, SearchCriteriaDto currentCriteria) {
        if (deepseekApiKey == null || deepseekApiKey.isBlank()) {
            throw new IllegalStateException("Trợ lý AI chưa được cấu hình.");
        }
        try {
            return callDeepSeek(userMessage, currentCriteria);
        } catch (Exception e) {
            log.warn("DeepSeek request failed: {}", e.getClass().getSimpleName());
            throw new IllegalStateException("Không thể kết nối trợ lý AI. Vui lòng thử lại sau.", e);
        }
    }

    private synchronized RestClient getRestClient() {
        if (this.restClient == null) {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(Duration.ofSeconds(Math.max(3, timeoutSeconds)));
            factory.setReadTimeout(Duration.ofSeconds(Math.max(3, timeoutSeconds)));

            String baseUrl = (deepseekBaseUrl != null && !deepseekBaseUrl.isBlank())
                    ? deepseekBaseUrl.trim()
                    : "https://api.deepseek.com";

            this.restClient = RestClient.builder()
                    .requestFactory(factory)
                    .baseUrl(baseUrl)
                    .build();
        }
        return this.restClient;
    }

    private LlmParseResult callDeepSeek(String userMessage, SearchCriteriaDto currentCriteria) throws Exception {
        String systemPrompt = """
                Bạn là trợ lý AI thông minh của nền tảng đặt sân SmashCourt (chuyên cầu lông và pickleball tại Việt Nam).
                Nhiệm vụ của bạn là phân tích câu yêu cầu của người chơi và trích xuất thông tin tìm kiếm.
                
                QUY TẮC BẮT BUỘC:
                1. Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown code block ```json).
                2. Cấu trúc JSON gồm:
                {
                  "sportType": "badminton" hoặc "pickleball",
                  "district": "Tên quận/huyện chuẩn hóa tại Việt Nam (ví dụ: Quận 1, Quận 10, Phú Nhuận, Bình Thạnh, Cầu Giấy, Đống Đa...) hoặc null nếu không đề cập",
                  "startTime": "HH:mm (ví dụ 19:00) hoặc null nếu không đề cập",
                  "endTime": "HH:mm (ví dụ 21:00) hoặc null nếu không đề cập",
                  "maxPricePerHour": số tiền VND tối đa/giờ dạng số thực (ví dụ 150000.0) hoặc null nếu không đề cập,
                  "amenities": ["mảng các tiện ích nếu có nhắc đến: Bãi đỗ ô tô, Máy lạnh, Cho thuê vợt, Phòng tắm nóng lạnh"],
                  "reply": "Câu trả lời thân thiện, lịch sự bằng tiếng Việt (1-2 câu). Nếu người dùng tìm sân, hãy tóm tắt tiêu chí nhận diện và mời xem danh sách sân bên dưới. Nếu người dùng hỏi luật cầu lông (như luật giao cầu 1.15m, luật tính điểm 21, vạch đánh đôi...) hoặc tư vấn vợt, hãy giải đáp chính xác, hữu ích và súc tích trong trường reply này."
                }
                """;

        String userPrompt = userMessage;
        if (currentCriteria != null) {
            userPrompt = String.format("Tiêu chí đã chọn trước đó: [Quận: %s, Giờ: %s - %s, Giá tối đa: %s].\nTin nhắn người dùng: %s",
                    currentCriteria.getDistrict(),
                    currentCriteria.getStartTime(),
                    currentCriteria.getEndTime(),
                    currentCriteria.getMaxPricePerHour(),
                    userMessage);
        }

        Map<String, Object> payload = Map.of(
                "model", (deepseekModel != null && !deepseekModel.isBlank()) ? deepseekModel.trim() : "deepseek-chat",
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0.2
        );

        String jsonPayload = objectMapper.writeValueAsString(payload);

        String responseBody = getRestClient().post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + deepseekApiKey.trim())
                .header("Content-Type", "application/json")
                .body(jsonPayload)
                .retrieve()
                .body(String.class);

        if (responseBody == null || responseBody.isBlank()) {
            throw new IllegalStateException("DeepSeek returned empty response");
        }

        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode choices = root.path("choices");
        if (!choices.isArray() || choices.isEmpty()) {
            throw new IllegalStateException("DeepSeek response missing choices");
        }

        String content = choices.get(0).path("message").path("content").asText();
        content = cleanJsonMarkdown(content);
        JsonNode parsed = objectMapper.readTree(content);

        SearchCriteriaDto criteria = new SearchCriteriaDto();
        if (currentCriteria != null) {
            criteria.setDistrict(currentCriteria.getDistrict());
            criteria.setStartTime(currentCriteria.getStartTime());
            criteria.setEndTime(currentCriteria.getEndTime());
            criteria.setMaxPricePerHour(currentCriteria.getMaxPricePerHour());
            criteria.setAmenities(new ArrayList<>(currentCriteria.getAmenities()));
            criteria.setSportType(currentCriteria.getSportType());
        }

        if (parsed.hasNonNull("sportType")) {
            criteria.setSportType(parsed.get("sportType").asText());
        }
        if (parsed.hasNonNull("district")) {
            criteria.setDistrict(parsed.get("district").asText());
        }
        if (parsed.hasNonNull("startTime")) {
            criteria.setStartTime(parsed.get("startTime").asText());
        }
        if (parsed.hasNonNull("endTime")) {
            criteria.setEndTime(parsed.get("endTime").asText());
        }
        if (parsed.hasNonNull("maxPricePerHour")) {
            criteria.setMaxPricePerHour(parsed.get("maxPricePerHour").asDouble());
        }
        if (parsed.has("amenities") && parsed.get("amenities").isArray()) {
            List<String> amenities = criteria.getAmenities() != null ? criteria.getAmenities() : new ArrayList<>();
            for (JsonNode item : parsed.get("amenities")) {
                String val = item.asText();
                if (!amenities.contains(val)) {
                    amenities.add(val);
                }
            }
            criteria.setAmenities(amenities);
        }

        // Sanitize times if start time is provided without end time
        if (criteria.getStartTime() != null && (criteria.getEndTime() == null || criteria.getStartTime().compareTo(criteria.getEndTime()) >= 0)) {
            try {
                int hour = Integer.parseInt(criteria.getStartTime().split(":")[0]);
                criteria.setEndTime(String.format("%02d:00", Math.min(23, hour + 2)));
            } catch (Exception ignored) {}
        }

        String reply = parsed.hasNonNull("reply") ? parsed.get("reply").asText() : "Dưới đây là các cụm sân phù hợp nhất theo yêu cầu của bạn!";
        return new LlmParseResult(criteria, reply);
    }

    private String cleanJsonMarkdown(String content) {
        if (content == null) return "{}";
        String trimmed = content.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

}
