package com.badmintonbooking.court.service;

import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.court.dto.UploadedImageDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
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

    private final ObjectMapper objectMapper;

    public CloudinaryUploadService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public UploadedImageDto uploadImage(MultipartFile file, String baseOrigin) {
        byte[] content = validateAndRead(file);

        if (isCloudinaryConfigured()) {
            try {
                return uploadToCloudinary(file, content);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                log.warn("Cloudinary upload interrupted, falling back to local storage");
            } catch (Exception ex) {
                log.warn("Cloudinary upload failed, falling back to local storage: {}", ex.getMessage());
            }
        }
        return saveToLocalStorage(file, content, baseOrigin);
    }

    public boolean isCloudinaryConfigured() {
        return cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank();
    }

    /**
     * Validates size, declared content type and the real file signature (magic bytes),
     * so a non-image file cannot be uploaded by only spoofing the Content-Type header.
     */
    private byte[] validateAndRead(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn ít nhất một tệp hình ảnh hợp lệ.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("Dung lượng ảnh không được vượt quá 10MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BadRequestException("Định dạng tệp không hỗ trợ. Vui lòng chọn ảnh JPG, PNG, WEBP hoặc GIF.");
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException ex) {
            throw new BadRequestException("Không thể đọc tệp ảnh tải lên.");
        }
        if (detectImageType(content) == null) {
            throw new BadRequestException("Nội dung tệp không phải là ảnh hợp lệ (JPG, PNG, WEBP hoặc GIF).");
        }
        return content;
    }

    /** Returns the detected MIME type from magic bytes, or null if not a supported image. */
    private String detectImageType(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return "image/png";
        }
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8'
                && (b[4] == '7' || b[4] == '9') && b[5] == 'a') {
            return "image/gif";
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    private UploadedImageDto uploadToCloudinary(MultipartFile file, byte[] content) throws Exception {
        long timestamp = System.currentTimeMillis() / 1000L;
        String signature = sha1Hex("folder=" + folder + "&timestamp=" + timestamp + apiSecret.trim());

        String boundary = "----SmashCourtCloudinary" + UUID.randomUUID().toString().replace("-", "");
        byte[] bodyBytes = buildMultipartBody(boundary, file, content, timestamp, signature);

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

        JsonNode json = objectMapper.readTree(response.body());
        String secureUrl = json.path("secure_url").asText(null);
        String publicId = json.path("public_id").asText(null);
        if (secureUrl == null || secureUrl.isBlank()) {
            throw new IOException("Không nhận được secure_url từ Cloudinary.");
        }

        return new UploadedImageDto(
                secureUrl,
                publicId,
                "CLOUDINARY",
                file.getOriginalFilename(),
                file.getSize()
        );
    }

    private UploadedImageDto saveToLocalStorage(MultipartFile file, byte[] content, String baseOrigin) {
        try {
            Path facilitiesDir = Paths.get(uploadDir, "facilities").toAbsolutePath().normalize();
            Files.createDirectories(facilitiesDir);

            // Extension is derived from the detected content, never from the client-supplied name.
            String ext = extensionFor(detectImageType(content));
            String storedName = "sc_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path targetPath = facilitiesDir.resolve(storedName).normalize();
            if (!targetPath.startsWith(facilitiesDir)) {
                throw new BadRequestException("Tên tệp không hợp lệ.");
            }

            try (InputStream in = new java.io.ByteArrayInputStream(content)) {
                Files.copy(in, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

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
            log.error("Failed to store uploaded image locally", ex);
            throw new RuntimeException("Không thể lưu tệp ảnh tải lên.", ex);
        }
    }

    private byte[] buildMultipartBody(String boundary, MultipartFile file, byte[] content,
                                      long timestamp, String signature) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream(content.length + 1024);
        writeFormField(out, boundary, "api_key", apiKey.trim());
        writeFormField(out, boundary, "timestamp", String.valueOf(timestamp));
        writeFormField(out, boundary, "folder", folder);
        writeFormField(out, boundary, "signature", signature);

        String filename = sanitizeFilename(file.getOriginalFilename());
        String contentType = detectImageType(content);

        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Type: " + contentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(content);
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
        out.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }

    private void writeFormField(ByteArrayOutputStream out, String boundary, String name, String value) throws IOException {
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write((value + "\r\n").getBytes(StandardCharsets.UTF_8));
    }

    /** Strips path segments and characters that could break the multipart header. */
    private String sanitizeFilename(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            return "upload.jpg";
        }
        String name = originalName.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);
        name = name.replaceAll("[\"\\r\\n]", "_");
        return name.isBlank() ? "upload.jpg" : name;
    }

    private String sha1Hex(String value) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }

    private String extensionFor(String mimeType) {
        if ("image/png".equals(mimeType)) return ".png";
        if ("image/webp".equals(mimeType)) return ".webp";
        if ("image/gif".equals(mimeType)) return ".gif";
        return ".jpg";
    }
}
