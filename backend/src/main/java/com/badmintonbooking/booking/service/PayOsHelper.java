package com.badmintonbooking.booking.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class PayOsHelper {

    private static final Logger log = LoggerFactory.getLogger(PayOsHelper.class);

    /**
     * Tạo mã HMAC_SHA256 để xác thực signature từ Webhook payOS
     */
    public String calculateHmacSha256(String data, String key) {
        try {
            Mac hmacSha256 = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmacSha256.init(secretKey);
            byte[] hash = hmacSha256.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            log.error("Lỗi tạo chữ ký HMAC-SHA256: ", e);
            return "";
        }
    }

    /**
     * Tạo URL VietQR chuẩn NAPAS phục vụ hiển thị mã QR thanh toán trên giao diện
     */
    public String generateVietQrUrl(String bankBin, String accountNumber, BigDecimal amount, String description) {
        try {
            String encodedDesc = URLEncoder.encode(description, StandardCharsets.UTF_8);
            return String.format(
                    "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s",
                    bankBin,
                    accountNumber,
                    amount.longValue(),
                    encodedDesc
            );
        } catch (Exception e) {
            return "";
        }
    }
}
