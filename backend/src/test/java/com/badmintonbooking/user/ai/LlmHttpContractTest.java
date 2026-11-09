package com.badmintonbooking.user.ai;

import com.badmintonbooking.user.ai.dto.SearchCriteriaDto;
import com.badmintonbooking.user.ai.service.LlmClient;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class LlmHttpContractTest {
    private LlmClient client(HttpServer server) {
        var client = new LlmClient(new ObjectMapper());
        ReflectionTestUtils.setField(client, "deepseekApiKey", "test-placeholder");
        ReflectionTestUtils.setField(client, "deepseekBaseUrl", "http://127.0.0.1:" + server.getAddress().getPort());
        ReflectionTestUtils.setField(client, "timeoutSeconds", 3);
        return client;
    }

    @Test void parsesDurationAndRemovesPreviousBudget() throws Exception {
        var mapper = new ObjectMapper();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/chat/completions", exchange -> {
            var payload = mapper.readTree(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            String output = "{\"intent\":\"SEARCH\",\"date\":\"2027-01-01\",\"startTime\":\"19:00\",\"durationMinutes\":90,\"maxTotalPrice\":250000,\"clearFields\":[\"maxPricePerHour\"],\"reply\":\"test\"}";
            if (payload.path("max_tokens").asInt() != 800) { exchange.sendResponseHeaders(400, -1); exchange.close(); return; }
            byte[] response = mapper.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", output))))).getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length); exchange.getResponseBody().write(response); exchange.close();
        });
        server.start();
        try {
            var previous = new SearchCriteriaDto(); previous.setMaxPricePerHour(100000.0);
            var parsed = client(server).parseMessage("90 phút, bỏ giá theo giờ, cả buổi tối đa 250k", previous);
            assertEquals("20:30", parsed.criteria.getEndTime());
            assertNull(parsed.criteria.getMaxPricePerHour());
            assertEquals(250000.0, parsed.criteria.getMaxTotalPrice());
        } finally { server.stop(0); }
    }

    @Test void opensCircuitAfterRepeatedProviderFailures() throws Exception {
        var calls = new AtomicInteger();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/chat/completions", exchange -> { calls.incrementAndGet(); exchange.getRequestBody().readAllBytes(); exchange.sendResponseHeaders(503, -1); exchange.close(); });
        server.start();
        try {
            var client = client(server);
            for (int i = 0; i < 4; i++) assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> client.parseMessage("tìm sân", null));
            assertEquals(3, calls.get());
        } finally { server.stop(0); }
    }
}
