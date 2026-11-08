package com.badmintonbooking.user.ai;

import com.badmintonbooking.user.ai.service.LlmClient;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class LlmClientTest {
    @Test void noKeyReturnsErrorInsteadOfInventingAiResponse() {
        LlmClient client = new LlmClient(new ObjectMapper());
        assertThrows(IllegalStateException.class, () -> client.parseMessage("Tìm sân Cầu Giấy", null));
    }
}
