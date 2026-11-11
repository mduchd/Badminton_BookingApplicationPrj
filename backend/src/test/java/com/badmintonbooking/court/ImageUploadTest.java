package com.badmintonbooking.court;

import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.court.controller.OwnerCourtController;
import com.badmintonbooking.court.dto.UploadedImageDto;
import com.badmintonbooking.court.service.CloudinaryUploadService;
import com.badmintonbooking.court.service.OwnerCourtManagementService;
import com.badmintonbooking.security.OwnerAuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Collections;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ImageUploadTest {
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVWQAAAAASUVORK5CYII=");
    @TempDir Path uploadDir;
    private CloudinaryUploadService service;

    @BeforeEach void setup() {
        service = new CloudinaryUploadService(new ObjectMapper());
        ReflectionTestUtils.setField(service, "uploadDir", uploadDir.toString());
    }

    private MockMultipartFile image() {
        return new MockMultipartFile("files", "../../wrong-extension.jpg", "image/png", PNG);
    }

    private void assertLocal(UploadedImageDto result, byte[] expected, String extension) throws IOException {
        assertEquals("LOCAL_STORAGE", result.provider());
        assertTrue(result.url().startsWith("https://booking.example/api/uploads/facilities/sc_"));
        assertTrue(result.url().endsWith(extension));
        Path stored = uploadDir.resolve("facilities").resolve(result.url().substring(result.url().lastIndexOf('/') + 1));
        assertArrayEquals(expected, Files.readAllBytes(stored));
        assertEquals(expected.length, result.sizeBytes());
    }

    @Test void storesActualImageWithDetectedExtensionInsteadOfClientFilename() throws Exception {
        assertLocal(service.uploadImage(image(), "https://booking.example/"), PNG, ".png");
    }

    @ParameterizedTest
    @CsvSource({"image/jpeg,ffd8ff00,.jpg", "image/gif,47494638396100,.gif",
            "image/webp,524946460000000057454250,.webp"})
    void acceptsOtherSupportedSignatures(String type, String hex, String extension) throws Exception {
        byte[] bytes = HexFormat.of().parseHex(hex);
        var file = new MockMultipartFile("files", "upload.dat", type, bytes);
        assertLocal(service.uploadImage(file, "https://booking.example"), bytes, extension);
    }

    @Test void rejectsSpoofedImageContentWithoutWritingFiles() throws Exception {
        var fake = new MockMultipartFile("files", "fake.png", "image/png", "<script>fake</script>".getBytes(StandardCharsets.UTF_8));
        assertThrows(BadRequestException.class, () -> service.uploadImage(fake, "https://booking.example"));
        assertFalse(Files.exists(uploadDir.resolve("facilities")));
    }

    @Test void rejectsUnsupportedDeclaredType() {
        var file = new MockMultipartFile("files", "image.svg", "image/svg+xml", PNG);
        assertThrows(BadRequestException.class, () -> service.uploadImage(file, "https://booking.example"));
    }

    @Test void rejectsEmptyAndMissingFiles() {
        assertThrows(BadRequestException.class, () -> service.uploadImage(null, "https://booking.example"));
        var empty = new MockMultipartFile("files", "empty.png", "image/png", new byte[0]);
        assertThrows(BadRequestException.class, () -> service.uploadImage(empty, "https://booking.example"));
    }

    @Test void rejectsFilesLargerThanTenMiBBeforeReadingContent() throws Exception {
        MultipartFile large = mock(MultipartFile.class);
        when(large.getSize()).thenReturn(10L * 1024 * 1024 + 1);
        assertThrows(BadRequestException.class, () -> service.uploadImage(large, "https://booking.example"));
        verify(large, never()).getBytes();
    }

    private HttpClient configuredClient() {
        ReflectionTestUtils.setField(service, "cloudName", "fixture-cloud");
        ReflectionTestUtils.setField(service, "apiKey", "fixture-key");
        ReflectionTestUtils.setField(service, "apiSecret", "fixture-secret");
        ReflectionTestUtils.setField(service, "folder", "fixture-folder");
        HttpClient client = mock(HttpClient.class);
        ReflectionTestUtils.setField(service, "httpClient", client);
        return client;
    }

    @Test @SuppressWarnings("unchecked")
    void parsesFormattedCloudinaryJsonWithoutFallingBackToDisk() throws Exception {
        HttpClient client = configuredClient();
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{\n  \"secure_url\": \"https://res.cloudinary.com/fixture/image.png\",\n  \"public_id\": \"fixture/image\"\n}");
        doReturn(response).when(client).send(any(), any());
        var result = service.uploadImage(image(), "https://booking.example");
        assertEquals("CLOUDINARY", result.provider());
        assertEquals("https://res.cloudinary.com/fixture/image.png", result.url());
        assertEquals("fixture/image", result.publicId());
        assertFalse(Files.exists(uploadDir.resolve("facilities")));
    }

    @Test void cloudinaryFailureFallsBackToIdenticalLocalContent() throws Exception {
        HttpClient client = configuredClient();
        doThrow(new IOException("fixture network failure")).when(client).send(any(), any());
        assertLocal(service.uploadImage(image(), "https://booking.example"), PNG, ".png");
    }

    @Test void uploadLimitCountsBothMultipartParameterNamesBeforeAnyUpload() {
        var uploader = mock(CloudinaryUploadService.class);
        var authorization = mock(OwnerAuthorizationService.class);
        var controller = new OwnerCourtController(mock(OwnerCourtManagementService.class), uploader, authorization);
        assertThrows(BadRequestException.class, () -> controller.uploadImages(
                Collections.nCopies(10, image()), image(), new MockHttpServletRequest()));
        verify(authorization).requireCurrentOwnerOrAdmin();
        verifyNoInteractions(uploader);
    }

    @Test void acceptsExactlyTenFiles() {
        var uploader = mock(CloudinaryUploadService.class);
        var authorization = mock(OwnerAuthorizationService.class);
        var controller = new OwnerCourtController(mock(OwnerCourtManagementService.class), uploader, authorization);
        var result = controller.uploadImages(Collections.nCopies(10, image()), null, new MockHttpServletRequest());
        assertEquals(201, result.getStatusCode().value());
        assertEquals(10, result.getBody().size());
        verify(authorization).requireCurrentOwnerOrAdmin();
        verify(uploader, times(10)).uploadImage(any(), anyString());
    }
}
