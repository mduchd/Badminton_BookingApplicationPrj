package com.badmintonbooking.user.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Component
public class GoogleTokenVerifier {
    private final String clientId;
    private final JwtDecoder decoder;

    @Autowired
    public GoogleTokenVerifier(@Value("${app.google.client-id:}") String clientId) {
        this(clientId, NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build());
    }

    GoogleTokenVerifier(String clientId, JwtDecoder decoder) {
        this.clientId = clientId;
        this.decoder = decoder;
    }

    public GoogleIdentity verify(String credential) {
        if (clientId.isBlank()) throw new IllegalStateException("Đăng nhập Google chưa được cấu hình");
        try {
            Jwt jwt = decoder.decode(credential);
            String issuer = jwt.getClaimAsString("iss");
            String email = jwt.getClaimAsString("email");
            String subject = jwt.getSubject();
            if (!("https://accounts.google.com".equals(issuer) || "accounts.google.com".equals(issuer))
                    || !jwt.getAudience().contains(clientId) || jwt.getExpiresAt() == null
                    || !Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))
                    || email == null || email.isBlank() || subject == null || subject.isBlank()) {
                throw new IllegalArgumentException("Thông tin đăng nhập Google không hợp lệ");
            }
            String name = jwt.getClaimAsString("name");
            return new GoogleIdentity(subject, email, name == null || name.isBlank() ? email : name.trim());
        } catch (JwtException e) {
            throw new IllegalArgumentException("Thông tin đăng nhập Google không hợp lệ", e);
        }
    }
}
