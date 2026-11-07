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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    /**
     * Parses the user message.
     * Uses DeepSeek API if DEEPSEEK_API_KEY is configured.
     * Gracefully falls back to rule-based regex parsing if the key is missing or the API call fails.
     */
    public LlmParseResult parseMessage(String userMessage, SearchCriteriaDto currentCriteria) {
        if (deepseekApiKey != null && !deepseekApiKey.trim().isBlank()) {
            try {
                return callDeepSeek(userMessage, currentCriteria);
            } catch (Exception e) {
                log.warn("DeepSeek API call failed ({}), falling back to regex parser", e.getMessage());
            }
        }
        return parseWithRegexFallback(userMessage, currentCriteria);
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

    private LlmParseResult parseWithRegexFallback(String userMessage, SearchCriteriaDto currentCriteria) {
        String lower = userMessage.toLowerCase();

        SearchCriteriaDto criteria = new SearchCriteriaDto();
        if (currentCriteria != null) {
            criteria.setDistrict(currentCriteria.getDistrict());
            criteria.setStartTime(currentCriteria.getStartTime());
            criteria.setEndTime(currentCriteria.getEndTime());
            criteria.setMaxPricePerHour(currentCriteria.getMaxPricePerHour());
            criteria.setAmenities(new ArrayList<>(currentCriteria.getAmenities()));
            criteria.setSportType(currentCriteria.getSportType());
        }

        // 1. Sport Type
        if (lower.contains("pickleball") || lower.contains("pickle")) {
            criteria.setSportType("pickleball");
        } else if (lower.contains("cầu lông") || lower.contains("badminton")) {
            criteria.setSportType("badminton");
        }

        // 2. District Detection (both Hanoi & HCM supported)
        String[] knownDistricts = {
            "quận 10", "q10", "quận 1", "q1", "phú nhuận", "thủ đức", "bình thạnh",
            "gò vấp", "tân bình", "cầu giấy", "đống đa", "hà đông", "thanh xuân",
            "nam từ liêm", "bắc từ liêm", "ba đình", "hoàn kiếm", "hai bà trưng"
        };
        for (String d : knownDistricts) {
            if (lower.contains(d)) {
                criteria.setDistrict(formatDistrictName(d));
                break;
            }
        }

        // 3. Time Detection
        Pattern timeHourPattern = Pattern.compile("(\\d{1,2})\\s*(?:h|giờ|:00)");
        Matcher matcher = timeHourPattern.matcher(lower);
        if (matcher.find()) {
            int startHour = Integer.parseInt(matcher.group(1));
            if (startHour >= 5 && startHour <= 23) {
                int endHour = Math.min(23, startHour + 2);
                criteria.setStartTime(String.format("%02d:00", startHour));
                criteria.setEndTime(String.format("%02d:00", endHour));
            }
        } else if (lower.contains("tối nay") || lower.contains("buổi tối")) {
            criteria.setStartTime("19:00");
            criteria.setEndTime("21:00");
        } else if (lower.contains("sáng mai") || lower.contains("buổi sáng")) {
            criteria.setStartTime("06:00");
            criteria.setEndTime("08:00");
        } else if (lower.contains("chiều nay") || lower.contains("buổi chiều")) {
            criteria.setStartTime("16:00");
            criteria.setEndTime("18:00");
        }

        // 4. Max Price Detection (e.g., "dưới 150k", "< 120k", "100.000")
        Pattern pricePattern = Pattern.compile("(?:dưới|<|khoảng|tầm|tối đa)?\\s*(\\d{2,3})\\s*(?:k|nghìn|ngàn)");
        Matcher priceMatcher = pricePattern.matcher(lower);
        if (priceMatcher.find()) {
            double price = Double.parseDouble(priceMatcher.group(1)) * 1000;
            criteria.setMaxPricePerHour(price);
        } else if (lower.contains("giá rẻ") || lower.contains("tiết kiệm")) {
            criteria.setMaxPricePerHour(100000.0);
        }

        // 5. Amenities
        List<String> amenities = criteria.getAmenities() != null ? criteria.getAmenities() : new ArrayList<>();
        if (lower.contains("ô tô") || lower.contains("xe hơi") || lower.contains("đỗ xe")) {
            if (!amenities.contains("Bãi đỗ ô tô")) amenities.add("Bãi đỗ ô tô");
        }
        if (lower.contains("máy lạnh") || lower.contains("điều hòa") || lower.contains("mát")) {
            if (!amenities.contains("Máy lạnh")) amenities.add("Máy lạnh");
        }
        if (lower.contains("thuê vợt") || lower.contains("mượn vợt")) {
            if (!amenities.contains("Cho thuê vợt")) amenities.add("Cho thuê vợt");
        }
        if (lower.contains("nóng lạnh") || lower.contains("tắm")) {
            if (!amenities.contains("Phòng tắm nóng lạnh")) amenities.add("Phòng tắm nóng lạnh");
        }
        criteria.setAmenities(amenities);

        // 6. Generate Natural Contextual Response
        StringBuilder replyBuilder = new StringBuilder();
        replyBuilder.append("SmashCourt AI đã phân tích yêu cầu của bạn: ");
        if (criteria.getDistrict() != null) {
            replyBuilder.append("Khu vực ").append(criteria.getDistrict()).append(", ");
        }
        if (criteria.getStartTime() != null) {
            replyBuilder.append("khung giờ ").append(criteria.getStartTime()).append(" - ").append(criteria.getEndTime()).append(", ");
        }
        if (criteria.getMaxPricePerHour() != null) {
            replyBuilder.append("mức giá dưới ").append(String.format("%,.0f", criteria.getMaxPricePerHour())).append(" đ/h, ");
        }
        if (!amenities.isEmpty()) {
            replyBuilder.append("ưu tiên ").append(String.join(", ", amenities)).append(". ");
        }

        replyBuilder.append("Dưới đây là các cụm sân phù hợp nhất để bạn đặt lịch ngay!");

        return new LlmParseResult(criteria, replyBuilder.toString());
    }

    private String formatDistrictName(String d) {
        return switch (d) {
            case "quận 10", "q10" -> "Quận 10";
            case "quận 1", "q1" -> "Quận 1";
            case "phú nhuận" -> "Phú Nhuận";
            case "thủ đức" -> "Thủ Đức";
            case "bình thạnh" -> "Bình Thạnh";
            case "gò vấp" -> "Gò Vấp";
            case "tân bình" -> "Tân Bình";
            case "cầu giấy" -> "Cầu Giấy";
            case "đống đa" -> "Đống Đa";
            case "hà đông" -> "Hà Đông";
            case "thanh xuân" -> "Thanh Xuân";
            case "nam từ liêm" -> "Nam Từ Liêm";
            case "bắc từ liêm" -> "Bắc Từ Liêm";
            case "ba đình" -> "Ba Đình";
            case "hoàn kiếm" -> "Hoàn Kiếm";
            case "hai bà trưng" -> "Hai Bà Trưng";
            default -> Character.toUpperCase(d.charAt(0)) + d.substring(1);
        };
    }
}
