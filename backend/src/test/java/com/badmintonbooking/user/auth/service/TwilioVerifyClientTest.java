package com.badmintonbooking.user.auth.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class TwilioVerifyClientTest {
    @Test void sendsSmsAndChecksOtpThroughVerifyApi() {
        RestClient.Builder builder = RestClient.builder();
        var server = MockRestServiceServer.bindTo(builder).build();
        var client = new TwilioVerifyClient("account-test", "token-test", "service-test", builder);
        server.expect(requestTo("https://verify.twilio.com/v2/Services/service-test/Verifications"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_FORM_URLENCODED))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Channel=sms")))
                .andRespond(withSuccess("{\"status\":\"pending\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://verify.twilio.com/v2/Services/service-test/VerificationCheck"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andRespond(withSuccess("{\"status\":\"approved\"}", MediaType.APPLICATION_JSON));
        client.send("+84912345678");
        assertTrue(client.verify("+84912345678", "123456"));
        server.verify();
    }
    @Test void missingConfigurationDoesNotSendAnything() {
        var client = new TwilioVerifyClient("", "", "", RestClient.builder());
        assertThrows(IllegalStateException.class, () -> client.send("+84912345678"));
    }
}
