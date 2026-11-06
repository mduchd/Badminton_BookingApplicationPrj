package com.badmintonbooking.user.ai.service;

import com.badmintonbooking.user.ai.dto.SearchCriteriaDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class LlmClient {

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    public static class LlmParseResult {
        public final SearchCriteriaDto criteria;
        public final String reply;

        public LlmParseResult(SearchCriteriaDto criteria, String reply) {
            this.criteria = criteria;
            this.reply = reply;
        }
    }

    public LlmParseResult parseMessage(String userMessage, SearchCriteriaDto currentCriteria) {
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
