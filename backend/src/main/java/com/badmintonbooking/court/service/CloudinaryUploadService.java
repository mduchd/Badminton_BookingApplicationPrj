package com.badmintonbooking.court.service;

import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.court.dto.UploadedImageDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class CloudinaryUploadService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryUploadService.class);
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    );
    private static final long MAX_BYTES = 10L * 1024L * 1024L;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Value("${cloudinary.folder:smashcourt/facilities}")
    private String folder;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    @Value("${server.port:8080}")
    private int serverPort;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    public UploadedImageDto uploadImage(MultipartFile file, String baseOrigin) {
        validateImageFile(file);

        if (isCloudinaryConfigured()) {
            try {
                return uploadToCloudinary(file);
            } catch (Exception ex) {
                log.warn("Cloudinary upload failed, falling back to local storage: {}", ex.getMessage());
            }
        }
        return saveToLocalStorage(file, baseOrigin);
    }

    public boolean isCloudinaryConfigured() {
        return cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank();
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn ít nhất một tệp hình ảnh hợp lệ.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("Dung lượng ảnh không được vượt quá 10MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BadRequestException("Định dạng tệp không hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WEBP.");
        }
    }

    private UploadedImageDto uploadToCloudinary(MultipartFile file) throws Exception {
        long timestamp = System.currentTimeMillis() / 1000L;
        String paramsToSign = "folder=" + folder + "&timestamp=" + timestamp + apiSecret;
        String signature = sha1Hex(paramsToSign);

        String boundary = "----SmashCourtCloudinary" + UUID.randomUUID().toString().replace("-", "");
        byte[] bodyBytes = buildMultipartBody(boundary, file, timestamp, signature);

        URI endpoint = URI.create("https://api.cloudinary.com/v1_1/" + cloudName.trim() + "/image/upload");
        HttpRequest request = HttpRequest.newBuilder(endpoint)
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(bodyBytes))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("Cloudinary HTTP " + response.statusCode() + ": " + response.body());
        }

        String json = response.body();
        String secureUrl = extractJsonString(json, "secure_url");
        String publicId = extractJsonString(json, "public_id");
        if (secureUrl == null || secureUrl.isBlank()) {
            throw new IOException("Không nhận được secure_url từ Cloudinary.");
        }

        return new UploadedImageDto(
                secureUrl.replace("\\/", "/"),
                publicId,
                "CLOUDINARY",
                file.getOriginalFilename(),
                file.getSize()
        );
    }

    private UploadedImageDto saveToLocalStorage(MultipartFile file, String baseOrigin) {
        try {
            Path facilitiesDir = Paths.get(uploadDir, "facilities").toAbsolutePath().normalize();
            Files.createDirectories(facilitiesDir);

            String ext = resolveExtension(file.getOriginalFilename(), file.getContentType());
            String storedName = "sc_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path targetPath = facilitiesDir.resolve(storedName);

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String origin = (baseOrigin != null && !baseOrigin.isBlank())
                    ? baseOrigin.replaceAll("/+$", "")
                    : "http://localhost:" + serverPort;
            String url = origin + "/api/uploads/facilities/" + storedName;

            return new UploadedImageDto(
                    url,
                    "local/facilities/" + storedName,
                    "LOCAL_STORAGE",
                    file.getOriginalFilename(),
                    file.getSize()
            );
        } catch (IOException ex) {
            throw new RuntimeException("Không thể lưu tệp ảnh tải lên: " + ex.getMessage(), ex);
        }
    }

    private byte[] buildMultipartBody(String boundary, MultipartFile file, long timestamp, String signature) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writeFormField(out, boundary, "api_key", apiKey.trim());
        writeFormField(out, boundary, "timestamp", String.valueOf(timestamp));
        writeFormField(out, boundary, "folder", folder);
        writeFormField(out, boundary, "signature", signature);

        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.jpg";
        String contentType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Type: " + contentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(file.getBytes());
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
        out.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }

    private void writeFormField(ByteArrayOutputStream out, String boundary, String name, String value) throws IOException {
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write((value + "\r\n").getBytes(StandardCharsets.UTF_8));
    }

    private String sha1Hex(String value) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }

    private String extractJsonString(String json, String key) {
        String pattern = "\"" + key + "\":\"";
        int idx = json.indexOf(pattern);
        if (idx == -1) return null;
        int start = idx + pattern.length();
        int end = json.indexOf("\"", start);
        return end > start ? json.substring(start, end) : null;
    }

    private String resolveExtension(String originalName, String contentType) {
        if (originalName != null && originalName.contains(".")) {
            String ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase(Locale.ROOT);
            if (ext.matches("\\.(jpg|jpeg|png|webp|gif)")) {
                return ext;
            }
        }
        if ("image/png".equalsIgnoreCase(contentType)) return ".png";
        if ("image/webp".equalsIgnoreCase(contentType)) return ".webp";
        if ("image/gif".equalsIgnoreCase(contentType)) return ".gif";
        return ".jpg";
    }
}
