package com.badmintonbooking.user.ai.controller;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.slf4j.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
public class AiObservabilityFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(AiObservabilityFilter.class);
    private final MeterRegistry metrics;
    public AiObservabilityFilter(MeterRegistry metrics) { this.metrics = metrics; }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/v1/ai/");
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String id = UUID.randomUUID().toString();
        response.setHeader("X-Request-ID", id);
        long start = System.nanoTime();
        try (MDC.MDCCloseable ignored = MDC.putCloseable("requestId", id)) {
            chain.doFilter(request, response);
        } finally {
            long elapsed = System.nanoTime() - start;
            metrics.timer("ai.http.duration", "status", Integer.toString(response.getStatus()))
                    .record(elapsed, TimeUnit.NANOSECONDS);
            log.info("AI request completed: requestId={}, status={}, elapsedMs={}", id, response.getStatus(), TimeUnit.NANOSECONDS.toMillis(elapsed));
        }
    }
}
