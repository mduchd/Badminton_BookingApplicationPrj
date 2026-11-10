package com.badmintonbooking.user.integration;

import com.badmintonbooking.user.auth.dto.UserResponse;
import com.badmintonbooking.user.auth.service.PasswordResetService;
import com.badmintonbooking.security.CurrentUserService;
import com.badmintonbooking.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.security.*;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class AccountIntegrationService {
    private final CurrentUserService current;
    private final UserRepository users;
    private final PushSubscriptionRepository pushes;
    private final CalendarConnectionRepository calendars;
    private final CalendarConsentRepository consents;
    private final BookingDeliveryRepository deliveries;
    private final GoogleCalendarClient google;
    private final FirebasePushClient firebase;
    private final IntegrationSecretBox secrets;
    public AccountIntegrationService(CurrentUserService current, UserRepository users, PushSubscriptionRepository pushes,
        CalendarConnectionRepository calendars, CalendarConsentRepository consents, BookingDeliveryRepository deliveries,
        GoogleCalendarClient google, FirebasePushClient firebase, IntegrationSecretBox secrets) {
        this.current=current; this.users=users; this.pushes=pushes; this.calendars=calendars; this.consents=consents;
        this.deliveries=deliveries; this.google=google; this.firebase=firebase; this.secrets=secrets;
    }
    public String callbackOrigin() { return google.callbackOrigin(); }
    public Map<String,Boolean> capabilities() { return Map.of("push",firebase.isConfigured(),"calendar",google.isConfigured()&&secrets.isConfigured()); }

    @Transactional public UserResponse subscribe(Principal principal, String token) {
        if (!firebase.isConfigured()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Thông báo chưa được cấu hình");
        var user=current.requireActiveUser(principal);
        var hash=PasswordResetService.hash(token);
        var subscription=pushes.findById(hash).orElseGet(PushSubscription::new);
        Long previousUser=subscription.userId;
        subscription.hash=hash; subscription.userId=user.getId(); subscription.token=token;
        pushes.saveAndFlush(subscription);
        if (previousUser!=null && !previousUser.equals(user.getId())) users.findById(previousUser).ifPresent(old->{old.setFcmEnabled(pushes.existsByUserId(previousUser)); users.save(old);});
        user.setFcmEnabled(true); users.save(user);
        return UserResponse.fromEntity(user);
    }
    @Transactional public UserResponse unsubscribe(Principal principal, String token) {
        var user=current.requireActiveUser(principal);
        if (token==null) pushes.deleteByUserId(user.getId());
        else pushes.findById(PasswordResetService.hash(token)).filter(s->s.userId.equals(user.getId())).ifPresent(pushes::delete);
        pushes.flush(); user.setFcmEnabled(pushes.existsByUserId(user.getId())); users.save(user);
        return UserResponse.fromEntity(user);
    }
    @Transactional public String startCalendar(Principal principal) {
        if (!capabilities().get("calendar")) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Đồng bộ lịch chưa được cấu hình");
        var user=current.requireActiveUser(principal);
        consents.deleteByUserId(user.getId());
        byte[] bytes=new byte[32]; new SecureRandom().nextBytes(bytes);
        String state=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var consent=new CalendarConsent(); consent.hash=PasswordResetService.hash(state); consent.userId=user.getId(); consent.expiresAt=OffsetDateTime.now().plusMinutes(10);
        consents.save(consent); return google.authorizationUrl(state);
    }
    @Transactional public void completeCalendar(String state, String code) {
        var consent=consents.lockByHash(PasswordResetService.hash(state)).filter(c->c.expiresAt.isAfter(OffsetDateTime.now()))
            .orElseThrow(()->new IllegalArgumentException("Invalid calendar consent"));
        var user=users.findByIdForUpdate(consent.userId).filter(u->"ACTIVE".equals(u.getStatus())).orElseThrow();
        var grant=google.exchange(code);
        var connection=new CalendarConnection(); connection.userId=user.getId(); connection.subject=grant.subject(); connection.refreshToken=secrets.encrypt(grant.refreshToken());
        calendars.save(connection); consents.delete(consent);
        user.setCalendarConnected(true); user.setCalendarEmail(grant.email()); users.save(user);
        deliveries.resetCalendar(user.getId());
    }
    @Transactional public UserResponse disconnectCalendar(Principal principal) {
        var user=current.requireActiveUser(principal);
        // Remove locally even if the remote provider is temporarily unavailable.
        calendars.findById(user.getId()).ifPresent(connection->{
            try { google.revoke(secrets.decrypt(connection.refreshToken)); }
            catch (RuntimeException ex) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Calendar revocation failed; local credentials removed"); }
            calendars.delete(connection);
        });
        consents.deleteByUserId(user.getId());
        user.setCalendarConnected(false); user.setCalendarEmail(null); users.save(user);
        return UserResponse.fromEntity(user);
    }
}
