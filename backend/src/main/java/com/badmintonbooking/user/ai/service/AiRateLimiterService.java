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

    public synchronized boolean allowRequest(String clientKey) {
        long now = System.currentTimeMillis();
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
