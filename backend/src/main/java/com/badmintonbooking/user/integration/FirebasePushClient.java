package com.badmintonbooking.user.integration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.*;
import com.google.firebase.messaging.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PreDestroy;
import java.io.*;
import java.nio.file.*;

@Component
public class FirebasePushClient {
    private final boolean enabled;
    private final String credentialsFile;
    private FirebaseApp app;
    public FirebasePushClient(@Value("${app.push.enabled:false}") boolean enabled,
            @Value("${app.push.credentials-file:}") String credentialsFile) {
        this.enabled=enabled; this.credentialsFile=credentialsFile;
    }
    public boolean isConfigured() { return enabled && !credentialsFile.isBlank() && Files.isRegularFile(Path.of(credentialsFile)); }
    private synchronized FirebaseMessaging messaging() throws IOException {
        if (app == null) {
            try (var input = Files.newInputStream(Path.of(credentialsFile))) {
                app = FirebaseApp.initializeApp(FirebaseOptions.builder().setCredentials(GoogleCredentials.fromStream(input))
                    .setConnectTimeout(5000).setReadTimeout(10000).build(), "smashcourt-push");
            }
        }
        return FirebaseMessaging.getInstance(app);
    }
    /** False only for an expired/unregistered token; transient failures remain retryable. */
    public boolean send(String token, String status, Long bookingId) throws IOException, FirebaseMessagingException {
        try {
            messaging().send(Message.builder().setToken(token)
                .putData("title", "Lịch đặt sân đã cập nhật")
                .putData("body", "Mở SmashCourt để xem trạng thái đơn đặt sân của bạn.")
                .putData("link", "/account?section=bookings")
                .putData("tag", "booking-"+bookingId+"-"+status).build());
            return true;
        } catch (FirebaseMessagingException ex) {
            if (ex.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) return false;
            throw ex;
        }
    }
    @PreDestroy public synchronized void close() { if (app!=null) app.delete(); }
}
