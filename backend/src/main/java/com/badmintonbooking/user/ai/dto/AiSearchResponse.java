package com.badmintonbooking.user.ai.dto;

import java.util.ArrayList;
import java.util.List;

public class AiSearchResponse {
    private String reply;
    private SearchCriteriaDto extractedCriteria;
    private List<AiRecommendedCourtDto> recommendedCourts = new ArrayList<>();
    private int remainingAiQuota;
    private long responseTimeMs;
    private String status;
    private List<AiRecommendedCourtDto> alternatives = new ArrayList<>();
    public List<AiRecommendedCourtDto> getAlternatives() { return alternatives; }
    public void setAlternatives(List<AiRecommendedCourtDto> alternatives) { this.alternatives = alternatives; }
    public String getStatus() {
        if (status != null) return status;
        if (!getMissingFields().isEmpty()) return "NEEDS_CLARIFICATION";
        return recommendedCourts.isEmpty() ? "NO_MATCH" : "RESULTS";
    }
    public void setStatus(String status) { this.status = status; }
    public List<String> getMissingFields() {
        if ("INFO_ONLY".equals(status)) return List.of();
        List<String> missing = new ArrayList<>();
        if (extractedCriteria == null || extractedCriteria.getDate() == null) missing.add("date");
        if (extractedCriteria == null || extractedCriteria.getStartTime() == null) missing.add("startTime");
        if (extractedCriteria == null || extractedCriteria.getEndTime() == null) missing.add("endTime");
        return missing;
    }

    public AiSearchResponse() {}

    public AiSearchResponse(String reply, SearchCriteriaDto extractedCriteria,
                            List<AiRecommendedCourtDto> recommendedCourts,
                            int remainingAiQuota, long responseTimeMs) {
        this.reply = reply;
        this.extractedCriteria = extractedCriteria;
        if (recommendedCourts != null) {
            this.recommendedCourts = recommendedCourts;
        }
        this.remainingAiQuota = remainingAiQuota;
        this.responseTimeMs = responseTimeMs;
    }

    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }

    public SearchCriteriaDto getExtractedCriteria() { return extractedCriteria; }
    public void setExtractedCriteria(SearchCriteriaDto extractedCriteria) { this.extractedCriteria = extractedCriteria; }

    public List<AiRecommendedCourtDto> getRecommendedCourts() { return recommendedCourts; }
    public void setRecommendedCourts(List<AiRecommendedCourtDto> recommendedCourts) { this.recommendedCourts = recommendedCourts; }

    public int getRemainingAiQuota() { return remainingAiQuota; }
    public void setRemainingAiQuota(int remainingAiQuota) { this.remainingAiQuota = remainingAiQuota; }

    public long getResponseTimeMs() { return responseTimeMs; }
    public void setResponseTimeMs(long responseTimeMs) { this.responseTimeMs = responseTimeMs; }
}
