package com.badmintonbooking.user.auth;

import com.badmintonbooking.security.JwtTokenProvider;
import com.badmintonbooking.user.auth.service.AuthService;
import com.badmintonbooking.user.auth.service.GoogleIdentity;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GoogleAuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final JwtTokenProvider tokens = mock(JwtTokenProvider.class);
    private final AuthService auth = new AuthService(users, mock(PasswordEncoder.class), tokens);
    private final GoogleIdentity identity = new GoogleIdentity("google-subject", "user@example.com", "Test User");

    @Test void createsCustomerForVerifiedNewGoogleIdentity() {
        when(users.findByProviderAndProviderSubject("GOOGLE", "google-subject")).thenReturn(Optional.empty());
        when(users.save(any(User.class))).thenAnswer(i -> { User user = i.getArgument(0); user.setId(42L); return user; });
        when(tokens.generateToken(42L, "user@example.com", "CUSTOMER")).thenReturn("session-token");
        var result = auth.loginWithGoogle(identity);
        assertEquals("session-token", result.accessToken());
        assertEquals("GOOGLE", result.user().provider());
        assertEquals("CUSTOMER", result.user().role());
    }

    @Test void createsCustomerWithAvatarForGoogleIdentity() {
        var identityWithAvatar = new GoogleIdentity("google-subject-2", "user2@example.com", "Test User 2", "https://avatar.google.com/photo.jpg");
        when(users.findByProviderAndProviderSubject("GOOGLE", "google-subject-2")).thenReturn(Optional.empty());
        when(users.save(any(User.class))).thenAnswer(i -> { User user = i.getArgument(0); user.setId(43L); return user; });
        when(tokens.generateToken(43L, "user2@example.com", "CUSTOMER")).thenReturn("session-token-2");
        var result = auth.loginWithGoogle(identityWithAvatar);
        assertEquals("session-token-2", result.accessToken());
        assertEquals("https://avatar.google.com/photo.jpg", result.user().avatarUrl());
    }

    @Test void updatesAvatarWithoutOverwritingSavedProfileName() {
        var identityWithAvatar = new GoogleIdentity("google-subject", "user@example.com", "Updated Name", "https://avatar.google.com/new.jpg");
        User existing = new User();
        existing.setId(42L);
        existing.setEmail("user@example.com");
        existing.setStatus("ACTIVE");
        existing.setRole("CUSTOMER");
        existing.setFullName("Tên đã lưu trong hồ sơ");
        existing.setAvatarUrl("https://avatar.google.com/old.jpg");
        when(users.findByProviderAndProviderSubject("GOOGLE", "google-subject")).thenReturn(Optional.of(existing));
        when(tokens.generateToken(42L, "user@example.com", "CUSTOMER")).thenReturn("session-token");

        var result = auth.loginWithGoogle(identityWithAvatar);
        assertEquals("https://avatar.google.com/new.jpg", result.user().avatarUrl());
        assertEquals("Tên đã lưu trong hồ sơ", result.user().fullName());
    }

    @Test void refusesToLinkExistingEmailWithoutProof() {
        when(users.findByProviderAndProviderSubject("GOOGLE", "google-subject")).thenReturn(Optional.empty());
        when(users.existsByEmail("user@example.com")).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> auth.loginWithGoogle(identity));
        verify(users, never()).save(any());
    }

    @Test void rejectsBlockedGoogleUser() {
        User user = new User(); user.setStatus("BLOCKED");
        when(users.findByProviderAndProviderSubject("GOOGLE", "google-subject")).thenReturn(Optional.of(user));
        assertThrows(IllegalStateException.class, () -> auth.loginWithGoogle(identity));
        verifyNoInteractions(tokens);
    }
}
