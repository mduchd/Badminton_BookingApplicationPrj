package com.badmintonbooking.user.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.*;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;
import java.util.*;

@Component
public class GoogleCalendarClient {
    public static final String CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
    private final String clientId, secret, redirect;
    private final RestClient http;
    public record Grant(String refreshToken, String subject, String email) {}

    @org.springframework.beans.factory.annotation.Autowired
    public GoogleCalendarClient(@Value("${app.google.client-id:}") String clientId,
            @Value("${app.google.client-secret:}") String secret,
            @Value("${app.google.calendar-redirect-uri:}") String redirect) {
        this.clientId=clientId; this.secret=secret; this.redirect=redirect;
        var factory = new SimpleClientHttpRequestFactory(); factory.setConnectTimeout(5000); factory.setReadTimeout(10000);
        this.http = RestClient.builder().requestFactory(factory).build();
    }
    GoogleCalendarClient(String clientId, String secret, String redirect, RestClient http) {
        this.clientId=clientId; this.secret=secret; this.redirect=redirect; this.http=http;
    }
    public boolean isConfigured() { return !clientId.isBlank() && !secret.isBlank() && !redirect.isBlank(); }
    public String callbackOrigin() { var uri=java.net.URI.create(redirect); return uri.getScheme()+"://"+uri.getAuthority(); }
    public String authorizationUrl(String state) {
        return UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
            .queryParam("client_id",clientId).queryParam("redirect_uri",redirect).queryParam("response_type","code")
            .queryParam("scope","openid email " + CALENDAR_SCOPE).queryParam("access_type","offline")
            .queryParam("prompt","consent").queryParam("state",state).build().encode().toUriString();
    }
    private JsonNode token(Map<String,String> values) {
        var form = new LinkedMultiValueMap<String,String>(); values.forEach(form::add);
        form.add("client_id",clientId); form.add("client_secret",secret);
        return http.post().uri("https://oauth2.googleapis.com/token").contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(form).retrieve().body(JsonNode.class);
    }
    public Grant exchange(String code) {
        var result = token(Map.of("code",code,"redirect_uri",redirect,"grant_type","authorization_code"));
        if (result == null || !Arrays.asList(result.path("scope").asText().split(" ")).contains(CALENDAR_SCOPE)
                || result.path("refresh_token").asText().isBlank()) throw new IllegalStateException("Calendar consent is incomplete");
        var info = http.get().uri("https://openidconnect.googleapis.com/v1/userinfo")
            .headers(h -> h.setBearerAuth(result.path("access_token").asText())).retrieve().body(JsonNode.class);
        if (info == null || !info.path("email_verified").asBoolean() || info.path("sub").asText().isBlank())
            throw new IllegalStateException("Calendar account is not verified");
        return new Grant(result.path("refresh_token").asText(),info.path("sub").asText(),info.path("email").asText());
    }
    public String refresh(String refreshToken) {
        var result = token(Map.of("refresh_token",refreshToken,"grant_type","refresh_token"));
        if (result == null || result.path("access_token").asText().isBlank()) throw new IllegalStateException("No calendar access token");
        return result.path("access_token").asText();
    }
    public void sync(String accessToken, String eventId, Map<String,Object> event, boolean cancelled) {
        String base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
        if (cancelled) {
            try { http.delete().uri(base+"/"+eventId).headers(h->h.setBearerAuth(accessToken)).retrieve().toBodilessEntity(); }
            catch (HttpClientErrorException ex) { if (ex.getStatusCode().value()!=404 && ex.getStatusCode().value()!=410) throw ex; }
            return;
        }
        try { http.put().uri(base+"/"+eventId).headers(h->h.setBearerAuth(accessToken)).body(event).retrieve().toBodilessEntity(); }
        catch (HttpClientErrorException.NotFound ex) {
            var payload = new HashMap<>(event); payload.put("id",eventId);
            try { http.post().uri(base).headers(h->h.setBearerAuth(accessToken)).body(payload).retrieve().toBodilessEntity(); }
            catch (HttpClientErrorException.Conflict conflict) {
                http.put().uri(base+"/"+eventId).headers(h->h.setBearerAuth(accessToken)).body(event).retrieve().toBodilessEntity();
            }
        }
    }
    public void revoke(String refreshToken) {
        var form = new LinkedMultiValueMap<String,String>(); form.add("token",refreshToken);
        try { http.post().uri("https://oauth2.googleapis.com/revoke").contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().toBodilessEntity(); }
        catch (HttpClientErrorException.BadRequest ignored) { /* Already revoked. */ }
    }
}
