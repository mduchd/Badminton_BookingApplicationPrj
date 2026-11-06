package com.badmintonbooking.user.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AiSearchRequest {

    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    @Size(max = 1000, message = "Nội dung câu hỏi không vượt quá 1000 ký tự")
    private String message;

    private String conversationId;

    private SearchCriteriaDto currentCriteria;

    public AiSearchRequest() {}

    public AiSearchRequest(String message, String conversationId, SearchCriteriaDto currentCriteria) {
        this.message = message;
        this.conversationId = conversationId;
        this.currentCriteria = currentCriteria;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public SearchCriteriaDto getCurrentCriteria() { return currentCriteria; }
    public void setCurrentCriteria(SearchCriteriaDto currentCriteria) { this.currentCriteria = currentCriteria; }
}
