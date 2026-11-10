package com.badmintonbooking.user.auth.service;

import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.user.auth.entity.PasswordResetToken;
import com.badmintonbooking.user.auth.repository.PasswordResetRepository;
import com.badmintonbooking.user.repository.UserRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class PasswordResetService {
    private final UserRepository users;
    private final PasswordResetRepository resets;
    private final PasswordEncoder passwords;
    private final ObjectProvider<JavaMailSender> mail;
    private final org.springframework.context.ApplicationEventPublisher events;
    private final String frontendUrl;
    private final String from;
    private final boolean enabled;

    public PasswordResetService(UserRepository users, PasswordResetRepository resets, PasswordEncoder passwords,
            ObjectProvider<JavaMailSender> mail, org.springframework.context.ApplicationEventPublisher events, @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl,
            @Value("${app.password-reset.from:}") String from, @Value("${app.password-reset.enabled:false}") boolean enabled) {
        this.users = users; this.resets = resets; this.passwords = passwords;
        this.mail = mail; this.events = events; this.frontendUrl = frontendUrl; this.from = from; this.enabled = enabled;
    }

    public boolean isAvailable() { return enabled && !from.isBlank() && mail.getIfAvailable() != null; }

    @Transactional
    public void request(String email) {
        if (!isAvailable()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Khôi phục mật khẩu chưa được cấu hình. Vui lòng liên hệ hỗ trợ.");
        users.findByEmail(email.trim().toLowerCase(Locale.ROOT)).filter(u -> "ACTIVE".equals(u.getStatus()) && u.getPasswordHash() != null).ifPresent(account -> {
            var user = users.findByIdForUpdate(account.getId()).orElseThrow();
            var latest = resets.findFirstByUserIdOrderByCreatedAtDesc(user.getId());
            if (latest.isPresent() && latest.get().createdAt.isAfter(OffsetDateTime.now().minusMinutes(1))) return;
            byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            resets.invalidateAll(user.getId());
            resets.save(new PasswordResetToken(hash(token), user.getId()));
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from); message.setTo(user.getEmail()); message.setSubject("Đặt lại mật khẩu SmashCourt");
            message.setText("Mở liên kết để đặt lại mật khẩu (hết hạn sau 20 phút):\n" + frontendUrl.replaceAll("/+$", "")
                    + "/?reset_token=" + token + "\nNếu bạn không yêu cầu, hãy bỏ qua email này.");
            events.publishEvent(new PasswordResetMail(message));
        });
    }

    @Transactional
    public void reset(String token, String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw new BadRequestException("Mật khẩu quá dài. Hãy dùng ít ký tự hơn.");
        // Use the same lock order as requesting a new token: user, then reset tokens.
        var userId = resets.findUserIdByHash(hash(token)).orElseThrow(() -> new BadRequestException("Liên kết không hợp lệ hoặc đã hết hạn"));
        var user = users.findByIdForUpdate(userId).filter(u -> "ACTIVE".equals(u.getStatus()))
                .orElseThrow(() -> new BadRequestException("Liên kết không hợp lệ hoặc đã hết hạn"));
        var reset = resets.lockByHash(hash(token)).filter(t -> !t.used && t.expiresAt.isAfter(OffsetDateTime.now()))
                .orElseThrow(() -> new BadRequestException("Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu email mới."));
        user.setPasswordHash(passwords.encode(password));
        user.setTokenVersion(user.getTokenVersion() + 1);
        user.setUpdatedAt(OffsetDateTime.now());
        resets.invalidateAll(user.getId()); reset.used = true;
        users.save(user);
    }

    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
