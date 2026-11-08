package com.badmintonbooking.user.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import java.time.Duration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

@Component
public class TwilioVerifyClient {
    private final String accountSid;
    private final String authToken;
    private final String serviceSid;
    private final RestClient client;

    @Autowired
    public TwilioVerifyClient(@Value("${TWILIO_ACCOUNT_SID:}") String accountSid,
                             @Value("${TWILIO_AUTH_TOKEN:}") String authToken,
                             @Value("${TWILIO_VERIFY_SERVICE_SID:}") String serviceSid) {
        this(accountSid, authToken, serviceSid, createBuilder());
    }

    TwilioVerifyClient(String accountSid, String authToken, String serviceSid, RestClient.Builder builder) {
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.serviceSid = serviceSid;
        this.client = builder.baseUrl("https://verify.twilio.com/v2").build();
    }

    private static RestClient.Builder createBuilder() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder().requestFactory(factory);
    }

    private void requireConfiguration() {
        if (accountSid.isBlank() || authToken.isBlank() || serviceSid.isBlank()) {
            throw new IllegalStateException("Dịch vụ gửi mã xác minh chưa được cấu hình.");
        }
    }

    public void send(String phone) {
        requireConfiguration();
        var form = new LinkedMultiValueMap<String, String>();
        form.add("To", phone);
        form.add("Channel", "sms");
        try {
            JsonNode response = client.post().uri("/Services/{sid}/Verifications", serviceSid)
                    .headers(h -> h.setBasicAuth(accountSid, authToken))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form)
                    .retrieve().body(JsonNode.class);
            if (response == null || !"pending".equals(response.path("status").asText())) {
                throw new IllegalStateException("Không thể gửi mã xác minh.");
            }
        } catch (Exception e) {
            throw new IllegalStateException("Không thể gửi mã xác minh. Vui lòng thử lại sau.");
        }
    }

    public boolean verify(String phone, String code) {
        requireConfiguration();
        var form = new LinkedMultiValueMap<String, String>();
        form.add("To", phone);
        form.add("Code", code);
        try {
            JsonNode response = client.post().uri("/Services/{sid}/VerificationCheck", serviceSid)
                    .headers(h -> h.setBasicAuth(accountSid, authToken))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form)
                    .retrieve().body(JsonNode.class);
            return response != null && "approved".equals(response.path("status").asText());
        } catch (Exception e) {
            return false;
        }
    }
}
