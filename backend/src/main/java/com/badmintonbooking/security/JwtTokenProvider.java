package com.badmintonbooking.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class JwtTokenProvider {

    @Value("${app.jwt.secret:SmashCourtSuperSecretKey2026ForBadmintonBookingPlatformSecurityMustBeLongEnough}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms:86400000}") // 24 hours
    private long jwtExpirationMs;

    public String generateToken(Object userId, String email, String role) {
        long now = System.currentTimeMillis();
        long exp = now + jwtExpirationMs;

        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

        String payloadJson = String.format(
                "{\"sub\":\"%s\",\"email\":\"%s\",\"role\":\"%s\",\"iat\":%d,\"exp\":%d}",
                userId.toString(), email, role, now / 1000, exp / 1000
        );
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

        String contentToSign = header + "." + payload;
        String signature = sign(contentToSign, jwtSecret);

        return contentToSign + "." + signature;
    }

    public boolean validateToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return false;
            }
            String expectedSignature = sign(parts[0] + "." + parts[1], jwtSecret);
            if (!expectedSignature.equals(parts[2])) {
                return false;
            }

            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            int expIdx = payloadJson.indexOf("\"exp\":");
            if (expIdx != -1) {
                int start = expIdx + 6;
                int commaIdx = payloadJson.indexOf(',', start);
                int braceIdx = payloadJson.indexOf('}', start);
                int end;
                if (commaIdx != -1 && (braceIdx == -1 || commaIdx < braceIdx)) {
                    end = commaIdx;
                } else {
                    end = braceIdx;
                }
                long exp = Long.parseLong(payloadJson.substring(start, end).trim());
                if (System.currentTimeMillis() / 1000 > exp) {
                    return false;
                }
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Long getUserIdFromToken(String token) {
        try {
            String[] parts = token.split("\\.");
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            int subIdx = payloadJson.indexOf("\"sub\":\"");
            if (subIdx != -1) {
                int start = subIdx + 7;
                int end = payloadJson.indexOf("\"", start);
                return Long.parseLong(payloadJson.substring(start, end).trim());
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    public String getEmailFromToken(String token) {
        try {
            String[] parts = token.split("\\.");
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            int emailIdx = payloadJson.indexOf("\"email\":\"");
            if (emailIdx != -1) {
                int start = emailIdx + 9;
                int end = payloadJson.indexOf("\"", start);
                return payloadJson.substring(start, end);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    public String getRoleFromToken(String token) {
        try {
            String[] parts = token.split("\\.");
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            int roleIdx = payloadJson.indexOf("\"role\":\"");
            if (roleIdx != -1) {
                int start = roleIdx + 8;
                int end = payloadJson.indexOf("\"", start);
                return payloadJson.substring(start, end);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private String sign(String data, String key) {
        try {
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] signedBytes = sha256Hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signedBytes);
        } catch (Exception e) {
            throw new RuntimeException("Error signing JWT", e);
        }
    }
}
