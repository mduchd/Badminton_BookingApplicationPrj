package com.badmintonbooking.user.auth;

import com.badmintonbooking.security.JwtTokenProvider;
import com.badmintonbooking.user.auth.dto.PhoneLoginRequest;
import com.badmintonbooking.user.auth.dto.RegisterRequest;
import com.badmintonbooking.user.auth.service.AuthService;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PhoneLoginTest {
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final JwtTokenProvider tokens = mock(JwtTokenProvider.class);
    private final AuthService auth = new AuthService(users, passwords, tokens);

    private User activeUser() {
        User user = new User(); user.setId(7L); user.setEmail("a@example.com");
        user.setRole("CUSTOMER"); user.setStatus("ACTIVE"); user.setPasswordHash("hash");
        return user;
    }
    @Test void acceptsNationalAndInternationalPhoneWithPassword() {
        var user = activeUser();
        when(users.findByPhoneVariants("0912345678", "84912345678", "0084912345678")).thenReturn(List.of(user));
        when(passwords.matches("secret", "hash")).thenReturn(true);
        when(tokens.generateToken(7L, "a@example.com", "CUSTOMER")).thenReturn("token");
        for (String number : List.of("0912 345 678", "+84 912 345 678", "0084 912345678")) {
            assertEquals("token", auth.loginByPhone(new PhoneLoginRequest(number, "secret")).accessToken());
        }
    }
    @Test void rejectsWrongPasswordAndLockedAccounts() {
        var user = activeUser();
        when(users.findByPhoneVariants(anyString(), anyString(), anyString())).thenReturn(List.of(user));
        assertThrows(IllegalArgumentException.class, () -> auth.loginByPhone(new PhoneLoginRequest("0912345678", "wrong")));
        when(passwords.matches("secret", "hash")).thenReturn(true);
        user.setStatus("LOCKED");
        assertThrows(IllegalStateException.class, () -> auth.loginByPhone(new PhoneLoginRequest("0912345678", "secret")));
        verifyNoInteractions(tokens);
    }
    @Test void ambiguousPhoneCannotSignInEvenWhenPasswordMatches() {
        when(users.findByPhoneVariants(anyString(), anyString(), anyString())).thenReturn(List.of(activeUser(), activeUser()));
        assertThrows(IllegalArgumentException.class, () -> auth.loginByPhone(new PhoneLoginRequest("0912345678", "secret")));
        verifyNoInteractions(passwords, tokens);
    }
    @Test void invalidNumbersAreRejected() {
        for (String number : List.of("123", "+1 212 555 0123", "09abc12345678", "09+12345678")) {
            assertThrows(IllegalArgumentException.class, () -> auth.loginByPhone(new PhoneLoginRequest(number, "secret")));
        }
        verifyNoInteractions(users);
    }
    @Test void registrationRejectsAnExistingPhone() {
        when(users.findByPhoneVariants("0912345678", "84912345678", "0084912345678")).thenReturn(List.of(activeUser()));
        var request = new RegisterRequest("new@example.com", "secret123", "Test", "+84 912 345 678", null);
        assertThrows(IllegalArgumentException.class, () -> auth.register(request));
        verify(users, never()).save(any());
    }
}
