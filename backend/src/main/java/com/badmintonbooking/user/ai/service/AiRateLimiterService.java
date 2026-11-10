package com.badmintonbooking.user.ai.service;

import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AiRateLimiterService {

    private static final int MAX_REQUESTS_PER_MINUTE = 15;
    private static final long TIME_WINDOW_MS = 60_000L; // 1 minute

    private final Map<String, Deque<Long>> requestHistory = new ConcurrentHashMap<>();
    private long lastCleanup;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.jdbc.core.JdbcTemplate jdbc;
    @org.springframework.beans.factory.annotation.Value("${ai.distributed-rate-limit:false}")
    private boolean distributed;

    private String hash(String key) {
        try {
            return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(key.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 60000)
    public void cleanupDistributedBuckets() {
        if (distributed && jdbc != null) jdbc.update("DELETE FROM ai_rate_limit_buckets WHERE bucket_started_at < CURRENT_TIMESTAMP - INTERVAL '2 minutes'");
    }

    public synchronized boolean allowRequest(String clientKey) {
        if (distributed && jdbc != null) {
            return !jdbc.query("""
                INSERT INTO ai_rate_limit_buckets(client_hash, bucket_started_at, request_count)
                VALUES (?, date_trunc('minute', CURRENT_TIMESTAMP), 1)
                ON CONFLICT (client_hash, bucket_started_at) DO UPDATE
                SET request_count = ai_rate_limit_buckets.request_count + 1
                WHERE ai_rate_limit_buckets.request_count < 15
                RETURNING request_count
                """, (rs, row) -> rs.getInt(1), hash(clientKey)).isEmpty();
        }
        long now = System.currentTimeMillis();
        if (now - lastCleanup >= TIME_WINDOW_MS) {
            requestHistory.entrySet().removeIf(entry -> entry.getValue().isEmpty() || now - entry.getValue().peekLast() > TIME_WINDOW_MS);
            lastCleanup = now;
        }
        Deque<Long> timestamps = requestHistory.computeIfAbsent(clientKey, k -> new ArrayDeque<>());

        // Evict timestamps older than 1 minute
        while (!timestamps.isEmpty() && now - timestamps.peekFirst() > TIME_WINDOW_MS) {
            timestamps.pollFirst();
        }

        if (timestamps.size() < MAX_REQUESTS_PER_MINUTE) {
            timestamps.addLast(now);
            return true;
        }

        return false;
    }

    public synchronized int getRemainingQuota(String clientKey) {
        if (distributed && jdbc != null) {
            var counts = jdbc.query("SELECT request_count FROM ai_rate_limit_buckets WHERE client_hash = ? AND bucket_started_at = date_trunc('minute', CURRENT_TIMESTAMP)",
                    (rs, row) -> rs.getInt(1), hash(clientKey));
            return Math.max(0, MAX_REQUESTS_PER_MINUTE - (counts.isEmpty() ? 0 : counts.get(0)));
        }
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = requestHistory.get(clientKey);
        if (timestamps == null) {
            return MAX_REQUESTS_PER_MINUTE;
        }

        // Evict expired
        while (!timestamps.isEmpty() && now - timestamps.peekFirst() > TIME_WINDOW_MS) {
            timestamps.pollFirst();
        }

        return Math.max(0, MAX_REQUESTS_PER_MINUTE - timestamps.size());
    }
}
