package com.badmintonbooking.user.integration;

import org.junit.jupiter.api.*;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.http.*;
import org.springframework.http.MediaType;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GoogleCalendarClientTest {
    MockRestServiceServer server;
    GoogleCalendarClient client;
    @BeforeEach void setup() {
        var builder=RestClient.builder(); server=MockRestServiceServer.bindTo(builder).build();
        client=new GoogleCalendarClient("client-id","client-secret","https://api.example.test/api/v1/auth/calendar/callback",builder.build());
    }
    @AfterEach void verified() { server.verify(); }
    @Test void consentRequestsOfflineAccessAndCarriesState() {
        String url=client.authorizationUrl("single-use-state");
        assertTrue(url.startsWith("https://accounts.google.com/o/oauth2/v2/auth?"));
        assertTrue(url.contains("access_type=offline")); assertTrue(url.contains("state=single-use-state"));
        assertEquals("https://api.example.test",client.callbackOrigin());
    }
    @Test void exchangesCodeAndVerifiesAccountAndGrantedScope() {
        server.expect(requestTo("https://oauth2.googleapis.com/token")).andExpect(method(HttpMethod.POST))
            .andExpect(content().string(org.hamcrest.Matchers.allOf(org.hamcrest.Matchers.containsString("grant_type=authorization_code"),org.hamcrest.Matchers.containsString("code=code"))))
            .andRespond(withSuccess("{\"scope\":\"openid email "+GoogleCalendarClient.CALENDAR_SCOPE+"\",\"access_token\":\"access\",\"refresh_token\":\"refresh\"}",MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://openidconnect.googleapis.com/v1/userinfo")).andExpect(header("Authorization","Bearer access"))
            .andRespond(withSuccess("{\"sub\":\"subject\",\"email_verified\":true,\"email\":\"player@example.test\"}",MediaType.APPLICATION_JSON));
        var grant=client.exchange("code"); assertEquals("refresh",grant.refreshToken()); assertEquals("subject",grant.subject());
    }
    @Test void rejectsPartialConsent() {
        server.expect(requestTo("https://oauth2.googleapis.com/token"))
            .andRespond(withSuccess("{\"scope\":\"openid email\",\"access_token\":\"access\",\"refresh_token\":\"refresh\"}",MediaType.APPLICATION_JSON));
        assertThrows(IllegalStateException.class,()->client.exchange("code"));
    }
    @Test void createsMissingEventWithDeterministicIdAndUpdatesExistingOne() {
        String base="https://www.googleapis.com/calendar/v3/calendars/primary/events";
        server.expect(requestTo(base+"/event123")).andExpect(method(HttpMethod.PUT)).andRespond(withResourceNotFound());
        server.expect(requestTo(base)).andExpect(method(HttpMethod.POST)).andExpect(content().json("{\"id\":\"event123\",\"summary\":\"Test\"}"))
            .andRespond(withSuccess());
        server.expect(requestTo(base+"/event123")).andExpect(method(HttpMethod.PUT)).andRespond(withSuccess());
        client.sync("access","event123",Map.of("summary","Test"),false);
        client.sync("access","event123",Map.of("summary","Test"),false);
    }
    @Test void retriesConflictWithoutCreatingAnotherEventAndToleratesAlreadyDeletedEvent() {
        String base="https://www.googleapis.com/calendar/v3/calendars/primary/events";
        server.expect(requestTo(base+"/event123")).andRespond(withResourceNotFound());
        server.expect(requestTo(base)).andRespond(withStatus(HttpStatus.CONFLICT));
        server.expect(requestTo(base+"/event123")).andExpect(method(HttpMethod.PUT)).andRespond(withSuccess());
        server.expect(requestTo(base+"/event123")).andExpect(method(HttpMethod.DELETE)).andRespond(withStatus(HttpStatus.GONE));
        client.sync("access","event123",Map.of("summary","Test"),false);
        client.sync("access","event123",Map.of(),true);
    }
}
