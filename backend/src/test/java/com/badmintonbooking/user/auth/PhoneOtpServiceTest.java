package com.badmintonbooking.user.auth;

import com.badmintonbooking.user.auth.dto.AuthResponse;
import com.badmintonbooking.user.auth.dto.PhoneLoginRequest;
import com.badmintonbooking.user.auth.service.AuthService;
import com.badmintonbooking.user.auth.service.PhoneOtpService;
import com.badmintonbooking.user.auth.service.TwilioVerifyClient;
import com.badmintonbooking.user.entity.User;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PhoneOtpServiceTest {
    private final AuthService auth = mock(AuthService.class);
    private final TwilioVerifyClient twilio = mock(TwilioVerifyClient.class);
    private final PhoneOtpService service = new PhoneOtpService(auth, twilio);
    private final PhoneLoginRequest request = new PhoneLoginRequest("0912345678", "password");
    private void validUser() {
        User user = new User(); user.setId(7L); user.setPasswordHash("hash");
        when(auth.verifyPhonePassword(request)).thenReturn(user);
        when(auth.normalizePhone(request.phone())).thenReturn("0912345678");
    }
    @Test void issuesSessionOnlyAfterCorrectOtpAndRejectsReplay() {
        validUser();
        var challenge = service.start(request);
        verify(twilio).send("+84912345678");
        verify(auth, never()).completePhoneLogin(anyLong(), anyString(), anyString());
        assertThrows(IllegalArgumentException.class, () -> service.complete(challenge.challengeId(), "000000"));
        verify(auth, never()).completePhoneLogin(anyLong(), anyString(), anyString());
        when(twilio.verify("+84912345678", "123456")).thenReturn(true);
        when(auth.completePhoneLogin(7L, "+84912345678", "hash")).thenReturn(new AuthResponse("jwt", "Bearer", null));
        assertEquals("jwt", service.complete(challenge.challengeId(), "123456").accessToken());
        assertThrows(IllegalArgumentException.class, () -> service.complete(challenge.challengeId(), "123456"));
        verify(auth, times(1)).completePhoneLogin(7L, "+84912345678", "hash");
    }
    @Test void deniesTooManyIncorrectCodes() {
        validUser(); var challenge = service.start(request);
        for (int i = 0; i < 6; i++) assertThrows(IllegalArgumentException.class, () -> service.complete(challenge.challengeId(), "000000"));
        verify(twilio, times(5)).verify("+84912345678", "000000");
        verify(auth, never()).completePhoneLogin(anyLong(), anyString(), anyString());
    }
    @Test void limitsRepeatedSmsRequests() {
        validUser(); service.start(request);
        assertThrows(IllegalStateException.class, () -> service.start(request));
        verify(twilio, times(1)).send("+84912345678");
    }
    @Test void noChallengeWhenSendingFails() {
        validUser(); doThrow(new IllegalStateException("unavailable")).when(twilio).send(anyString());
        assertThrows(IllegalStateException.class, () -> service.start(request));
        verify(auth, never()).completePhoneLogin(anyLong(), anyString(), anyString());
    }
}
