package com.badmintonbooking.user.auth.service;

import com.badmintonbooking.user.auth.dto.AuthResponse;
import com.badmintonbooking.user.auth.dto.PhoneLoginRequest;
import org.springframework.stereotype.Service;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Base64;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PhoneOtpService {
    private static final long TTL_MS = Duration.ofMinutes(5).toMillis();
    private static final long SEND_WINDOW_MS = Duration.ofMinutes(10).toMillis();
    private static final long RESEND_MS = Duration.ofSeconds(60).toMillis();
    private final AuthService auth;
    private final TwilioVerifyClient twilio;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, Challenge> challenges = new ConcurrentHashMap<>();
    private final Map<String, Deque<Long>> sends = new ConcurrentHashMap<>();

    private static class Challenge {
        final Long userId;
        final String phone;
        final String passwordHash;
        final long expiresAt;
        int attempts;
        boolean consumed;
        Challenge(Long userId, String phone, String passwordHash, long expiresAt) { this.userId = userId; this.phone = phone; this.passwordHash = passwordHash; this.expiresAt = expiresAt; }
    }
    public record ChallengeResponse(String challengeId, int expiresInSeconds) {}
    public PhoneOtpService(AuthService auth, TwilioVerifyClient twilio) { this.auth = auth; this.twilio = twilio; }

    public ChallengeResponse start(PhoneLoginRequest request) {
        var user = auth.verifyPhonePassword(request);
        String national = auth.normalizePhone(request.phone());
        String phone = "+84" + national.substring(1);
        long now = System.currentTimeMillis();
        challenges.entrySet().removeIf(e -> e.getValue().expiresAt <= now || e.getValue().consumed);
        reserveSend(phone, now);
        twilio.send(phone);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String challengeId = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        challenges.put(challengeId, new Challenge(user.getId(), phone, user.getPasswordHash(), now + TTL_MS));
        return new ChallengeResponse(challengeId, (int) (TTL_MS / 1000));
    }

    private synchronized void reserveSend(String phone, long now) {
        sends.entrySet().removeIf(e -> { synchronized (e.getValue()) { return e.getValue().isEmpty() || now - e.getValue().peekLast() >= SEND_WINDOW_MS; } });
        Deque<Long> history = sends.computeIfAbsent(phone, key -> new ArrayDeque<>());
        synchronized (history) {
            while (!history.isEmpty() && now - history.peekFirst() >= SEND_WINDOW_MS) history.removeFirst();
            if (history.size() >= 3 || (!history.isEmpty() && now - history.peekLast() < RESEND_MS)) {
                throw new IllegalStateException("Bạn đã yêu cầu mã gần đây. Vui lòng thử lại sau.");
            }
            history.addLast(now);
        }
    }

    public AuthResponse complete(String challengeId, String code) {
        Challenge challenge = challenges.get(challengeId);
        if (challenge == null) throw new IllegalArgumentException("Mã xác minh không hợp lệ hoặc đã hết hạn.");
        synchronized (challenge) {
            if (challenge.consumed || challenge.expiresAt <= System.currentTimeMillis() || challenge.attempts >= 5) {
                challenges.remove(challengeId, challenge);
                throw new IllegalArgumentException("Mã xác minh không hợp lệ hoặc đã hết hạn.");
            }
            challenge.attempts++;
            if (!twilio.verify(challenge.phone, code)) {
                throw new IllegalArgumentException("Mã xác minh không hợp lệ hoặc đã hết hạn.");
            }
            challenge.consumed = true;
            challenges.remove(challengeId, challenge);
            return auth.completePhoneLogin(challenge.userId, challenge.phone, challenge.passwordHash);
        }
    }
}
