package com.badmintonbooking.user.auth.service;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GoogleTokenVerifierTest {
    private final JwtDecoder decoder = mock(JwtDecoder.class);
    private final GoogleTokenVerifier verifier = new GoogleTokenVerifier("our-client", decoder);
    private Jwt token(String issuer, String audience, boolean verified) {
        return Jwt.withTokenValue("token").header("alg", "RS256").subject("google-sub")
            .issuer(issuer).audience(List.of(audience)).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300))
            .claim("email", "person@example.com").claim("email_verified", verified).claim("name", "Person").build();
    }
    @Test void acceptsVerifiedIdentityForOurClient() {
        when(decoder.decode("token")).thenReturn(token("https://accounts.google.com", "our-client", true));
        assertEquals("google-sub", verifier.verify("token").subject());
    }
    @Test void rejectsWrongAudienceIssuerAndUnverifiedEmail() {
        when(decoder.decode("token")).thenReturn(token("https://accounts.google.com", "other", true),
            token("https://attacker.example", "our-client", true), token("https://accounts.google.com", "our-client", false));
        for (int i=0; i<3; i++) assertThrows(IllegalArgumentException.class, () -> verifier.verify("token"));
    }
    @Test void rejectsInvalidSignatureOrExpiredToken() {
        when(decoder.decode("token")).thenThrow(new JwtException("invalid signature or expired"));
        assertThrows(IllegalArgumentException.class, () -> verifier.verify("token"));
    }
}
