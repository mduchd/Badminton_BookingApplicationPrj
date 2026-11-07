package com.badmintonbooking.booking.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class PayOsHelper {

    private static final Logger log = LoggerFactory.getLogger(PayOsHelper.class);

    public record PayOsPaymentLinkResult(
            boolean success,
            String checkoutUrl,
            String qrCode,
            String paymentLinkId,
            String message
    ) {}

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
     * Tạo chữ ký chuẩn khi gọi API tạo link thanh toán của payOS (/v2/payment-requests)
     * Format: amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}
     */
    public String createPaymentLinkSignature(long amount, String cancelUrl, String description, long orderCode, String returnUrl, String checksumKey) {
        String dataString = String.format("amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",
                amount,
                cancelUrl != null ? cancelUrl : "",
                description != null ? description : "",
                orderCode,
                returnUrl != null ? returnUrl : ""
        );
        return calculateHmacSha256(dataString, checksumKey);
    }

    /**
     * Gọi API chính thức của payOS v2 để sinh link thanh toán và mã QR thật
     */
    public PayOsPaymentLinkResult createPaymentLink(
            String clientId, String apiKey, String checksumKey,
            long orderCode, long amount, String description,
            String returnUrl, String cancelUrl
    ) {
        if (clientId == null || clientId.isBlank() || apiKey == null || apiKey.isBlank() || checksumKey == null || checksumKey.isBlank()) {
            return new PayOsPaymentLinkResult(false, null, null, null, "Chưa cấu hình đủ bộ 3 key payOS");
        }

        try {
            // payOS giới hạn độ dài description tối đa 25 ký tự
            String desc = description != null ? description : "Thanh toan san";
            if (desc.length() > 25) {
                desc = desc.substring(0, 25);
            }

            String retUrl = (returnUrl != null && !returnUrl.isBlank()) ? returnUrl : "http://localhost:5173/payment/success";
            String canUrl = (cancelUrl != null && !cancelUrl.isBlank()) ? cancelUrl : "http://localhost:5173/payment/cancel";

            String signature = createPaymentLinkSignature(amount, canUrl, desc, orderCode, retUrl, checksumKey);

            String jsonPayload = String.format(
                    "{\"orderCode\":%d,\"amount\":%d,\"description\":\"%s\",\"cancelUrl\":\"%s\",\"returnUrl\":\"%s\",\"signature\":\"%s\"}",
                    orderCode,
                    amount,
                    escapeJson(desc),
                    escapeJson(canUrl),
                    escapeJson(retUrl),
                    signature
            );

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api-merchant.payos.vn/v2/payment-requests"))
                    .header("Content-Type", "application/json")
                    .header("x-client-id", clientId.trim())
                    .header("x-api-key", apiKey.trim())
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            String body = response.body();
            log.info("payOS createPaymentLink status: {}", response.statusCode());

            if (body != null && body.contains("\"code\":\"00\"")) {
                String checkoutUrl = extractJsonString(body, "checkoutUrl");
                String qrCode = extractJsonString(body, "qrCode");
                String paymentLinkId = extractJsonString(body, "paymentLinkId");

                log.info("Tạo link thanh toán payOS thành công: orderCode={}, paymentLinkId={}", orderCode, paymentLinkId);
                return new PayOsPaymentLinkResult(true, checkoutUrl, qrCode, paymentLinkId, "Thành công");
            } else {
                String descError = extractJsonString(body, "desc");
                if (descError == null) descError = "Lỗi phản hồi từ cổng payOS";
                log.warn("payOS phản hồi: {}", descError);
                return new PayOsPaymentLinkResult(false, null, null, null, descError);
            }
        } catch (Exception e) {
            log.error("Lỗi khi kết nối tới payOS API: ", e);
            return new PayOsPaymentLinkResult(false, null, null, null, e.getMessage());
        }
    }

    /**
     * Tạo URL VietQR chuẩn NAPAS phục vụ hiển thị mã QR thanh toán trên giao diện (Fallback/Offline)
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

    private String escapeJson(String raw) {
        if (raw == null) return "";
        return raw.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String extractJsonString(String json, String key) {
        if (json == null) return null;
        Pattern p = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"([^\"]+)\"");
        Matcher m = p.matcher(json);
        if (m.find()) {
            return m.group(1).replace("\\/", "/");
        }
        return null;
    }
}
