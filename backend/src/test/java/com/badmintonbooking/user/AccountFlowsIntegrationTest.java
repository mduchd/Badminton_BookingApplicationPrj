package com.badmintonbooking.user;

import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import com.badmintonbooking.user.auth.repository.PasswordResetRepository;
import com.badmintonbooking.user.auth.service.*;
import com.badmintonbooking.user.integration.*;
import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.enums.BookingStatus;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.court.entity.*;
import com.badmintonbooking.court.repository.*;
import com.badmintonbooking.security.JwtTokenProvider;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.util.UriComponentsBuilder;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.regex.Pattern;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

@SpringBootTest(properties={
    "spring.datasource.url=jdbc:h2:mem:account-flows;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop", "ai.enabled=false",
    "app.password-reset.enabled=true", "app.password-reset.from=no-reply@example.test",
    "app.integrations.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    "app.integrations.initial-delay-ms=3600000"
})
class AccountFlowsIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtTokenProvider jwt;
    @Autowired PasswordResetService resets;
    @Autowired PasswordResetRepository resetTokens;
    @Autowired AccountIntegrationService integrations;
    @Autowired CalendarConsentRepository consents;
    @Autowired CalendarConnectionRepository calendars;
    @Autowired PushSubscriptionRepository pushes;
    @Autowired BookingDeliveryRepository deliveries;
    @Autowired BookingIntegrationWorker worker;
    @Autowired BookingRepository bookings;
    @Autowired FacilityRepository facilities;
    @Autowired CourtRepository courts;
    @Autowired IntegrationSecretBox secrets;
    @MockitoBean JavaMailSender mail;
    @MockitoBean GoogleCalendarClient google;
    @MockitoBean FirebasePushClient firebase;
    MockMvc mvc;

    @BeforeEach void setup() {
        mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        reset(mail,google,firebase);
        when(google.isConfigured()).thenReturn(true); when(firebase.isConfigured()).thenReturn(true);
        when(google.authorizationUrl(anyString())).thenAnswer(call->"https://accounts.google.com/o/oauth2/v2/auth?state="+call.getArgument(0));
        when(google.callbackOrigin()).thenReturn("http://localhost:8080");
    }
    User user() {
        var user=new User(); user.setEmail(UUID.randomUUID()+"@example.test"); user.setFullName("Người chơi");
        user.setPasswordHash(passwords.encode("original123")); return users.save(user);
    }
    String bearer(User user) { return "Bearer "+jwt.generateToken(user.getId(),user.getEmail(),user.getRole(),user.getTokenVersion()); }
    String requestReset(User user) {
        resets.request(user.getEmail());
        var message=ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail,timeout(3000)).send(message.capture());
        var matcher=Pattern.compile("reset_token=([A-Za-z0-9_-]+)").matcher(message.getValue().getText());
        assertTrue(matcher.find()); return matcher.group(1);
    }
    String connect(User user) {
        String url=integrations.startCalendar(user::getEmail);
        String state=UriComponentsBuilder.fromUriString(url).build().getQueryParams().getFirst("state");
        when(google.exchange("valid-code")).thenReturn(new GoogleCalendarClient.Grant("private-refresh-token","google-subject-"+user.getId(),"calendar@example.test"));
        integrations.completeCalendar(state,"valid-code"); return state;
    }
    Booking confirmed(User user) {
        var facility=new Facility(); facility.setName("Sân thử nghiệm"); facility.setAddress("Hà Nội"); facility=facilities.save(facility);
        var court=new Court(); court.setFacilityId(facility.getId()); court.setName("Sân 1"); court=courts.save(court);
        var booking=new Booking(); booking.setCustomerId(user.getId()); booking.setCourtId(court.getId()); booking.setFacilityId(facility.getId());
        booking.setBookingDate(LocalDate.now().plusDays(1)); booking.setStartTime(LocalTime.of(18,0)); booking.setEndTime(LocalTime.of(19,0));
        booking.setTotalAmount(BigDecimal.valueOf(100000)); booking.setStatus(BookingStatus.CONFIRMED); return bookings.save(booking);
    }

    @Test void profilePersistsForCurrentUserAndRejectsDuplicateOrInvalidPhones() throws Exception {
        var user=user(); var other=user(); other.setPhone("+84 (912) 345-678"); users.save(other);
        String phone="08"+String.format("%08d",user.getId());
        mvc.perform(patch("/api/v1/account/profile").contentType("application/json").content("{\"fullName\":\"Test\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/account/profile").header("Authorization",bearer(user)).contentType("application/json")
            .content("{\"fullName\":\"Nguyễn An\",\"phone\":\"+84 "+phone.substring(1)+"\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.phone").value(phone));
        assertEquals("Nguyễn An",users.findById(user.getId()).orElseThrow().getFullName());
        for (String invalidPhone:List.of("0912345678","invalid")) mvc.perform(patch("/api/v1/account/profile").header("Authorization",bearer(user))
            .contentType("application/json").content("{\"fullName\":\"Test\",\"phone\":\""+invalidPhone+"\"}"))
            .andExpect(status().isBadRequest());
    }
    @Test void resetTokenIsHashedSingleUseAndRevokesOldSessions() throws Exception {
        var user=user(); String old=bearer(user), token=requestReset(user);
        assertTrue(resetTokens.existsById(PasswordResetService.hash(token))); assertFalse(resetTokens.existsById(token));
        mvc.perform(post("/api/v1/auth/reset-password").contentType("application/json").content("{\"token\":\""+token+"\",\"password\":\"new-password123\"}"))
            .andExpect(status().isOk());
        assertTrue(passwords.matches("new-password123",users.findById(user.getId()).orElseThrow().getPasswordHash()));
        assertThrows(RuntimeException.class,()->resets.reset(token,"other-password"));
        mvc.perform(get("/api/v1/auth/me").header("Authorization",old)).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/v1/account/profile").header("Authorization",old).contentType("application/json").content("{\"fullName\":\"Test\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/auth/login").contentType("application/json").content("{\"email\":\""+user.getEmail()+"\",\"password\":\"new-password123\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }
    @Test void expiredResetAndUnknownEmailDoNotChangeAnyPassword() {
        var user=user(); String token=requestReset(user);
        var entity=resetTokens.findById(PasswordResetService.hash(token)).orElseThrow(); entity.expiresAt=OffsetDateTime.now().minusMinutes(1); resetTokens.save(entity);
        assertThrows(RuntimeException.class,()->resets.reset(token,"new-password123"));
        assertTrue(passwords.matches("original123",users.findById(user.getId()).orElseThrow().getPasswordHash()));
        clearInvocations(mail); resets.request("unknown-"+UUID.randomUUID()+"@example.test"); verifyNoInteractions(mail);
    }

    @Test void simultaneousResetRequestsConsumeTokenOnlyOnce() throws Exception {
        var user=user(); String token=requestReset(user);
        try (var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var ready=new java.util.concurrent.CountDownLatch(2);
            var start=new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.Callable<Boolean> attempt=()->{
                ready.countDown(); start.await();
                try { resets.reset(token,"new-password123"); return true; }
                catch (com.badmintonbooking.common.exception.BadRequestException ex) { return false; }
            };
            var first=pool.submit(attempt); var second=pool.submit(attempt);
            assertTrue(ready.await(5,java.util.concurrent.TimeUnit.SECONDS)); start.countDown();
            int successes=(first.get(10,java.util.concurrent.TimeUnit.SECONDS)?1:0)+(second.get(10,java.util.concurrent.TimeUnit.SECONDS)?1:0);
            assertEquals(1,successes);
            assertEquals(1,users.findById(user.getId()).orElseThrow().getTokenVersion());
        }
    }
    @Test void calendarConsentIsBoundSingleUseAndCredentialsAreEncrypted() throws Exception {
        var user=user(); String state=connect(user);
        assertTrue(users.findById(user.getId()).orElseThrow().isCalendarConnected());
        var connection=calendars.findById(user.getId()).orElseThrow();
        assertFalse(connection.refreshToken.contains("private-refresh-token"));
        assertEquals("private-refresh-token",secrets.decrypt(connection.refreshToken));
        assertThrows(RuntimeException.class,()->integrations.completeCalendar(state,"valid-code"));
        mvc.perform(get("/api/v1/auth/calendar/callback").param("state","invalid").param("code","invalid"))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));
        integrations.disconnectCalendar(user::getEmail);
        assertFalse(calendars.existsById(user.getId())); assertFalse(users.findById(user.getId()).orElseThrow().isCalendarConnected());
    }
    @Test void confirmedAndCancelledBookingsSyncOnceWithStableEventIdentity() throws Exception {
        var user=user(); connect(user); integrations.subscribe(user::getEmail,"browser-device-token"); var booking=confirmed(user);
        when(google.refresh("private-refresh-token")).thenReturn("access-token"); when(firebase.send(anyString(),anyString(),anyLong())).thenReturn(true);
        worker.process(booking.getId()); worker.process(booking.getId());
        String eventId=BookingIntegrationWorker.eventId("google-subject-"+user.getId(),booking.getId());
        verify(google,times(1)).sync(eq("access-token"),eq(eventId),anyMap(),eq(false));
        verify(firebase,times(1)).send("browser-device-token","CONFIRMED",booking.getId());
        booking.setStatus(BookingStatus.CANCELLED); bookings.save(booking); worker.process(booking.getId());
        verify(google).sync(eq("access-token"),eq(eventId),anyMap(),eq(true));
        assertEquals(BookingStatus.CANCELLED,deliveries.findById(booking.getId()).orElseThrow().calendarStatus);
    }
    @Test void failedDeliveryRetriesAndInvalidPushTokensAreRemoved() throws Exception {
        var user=user(); connect(user); integrations.subscribe(user::getEmail,"expired-device-token"); var booking=confirmed(user);
        when(firebase.send(anyString(),anyString(),anyLong())).thenReturn(false);
        when(google.refresh(anyString())).thenThrow(new IllegalStateException("temporary outage"));
        worker.process(booking.getId());
        assertFalse(pushes.existsByUserId(user.getId())); assertFalse(users.findById(user.getId()).orElseThrow().isFcmEnabled());
        var delivery=deliveries.findById(booking.getId()).orElseThrow(); assertNull(delivery.calendarStatus);
        assertTrue(delivery.lockedUntil.isAfter(OffsetDateTime.now()));
        worker.process(booking.getId()); verify(google,times(1)).refresh(anyString());
        delivery.lockedUntil=OffsetDateTime.now().minusSeconds(1); deliveries.save(delivery);
        doReturn("access-token").when(google).refresh(anyString()); worker.process(booking.getId());
        assertEquals(BookingStatus.CONFIRMED,deliveries.findById(booking.getId()).orElseThrow().calendarStatus);
    }
    @Test void secretBoxRejectsTamperingAndCalendarIdsUseGoogleAlphabet() {
        String encrypted=secrets.encrypt("secret"); byte[] bytes=Base64.getDecoder().decode(encrypted); bytes[bytes.length-1]^=1;
        assertThrows(IllegalStateException.class,()->secrets.decrypt(Base64.getEncoder().encodeToString(bytes)));
        assertTrue(BookingIntegrationWorker.eventId("subject",123L).matches("[0-9a-v]{5,1024}"));
    }

    @Test void deliveryQueryFindsPendingWorkAndExcludesCompletedDelivery() {
        var user=user(); connect(user); var booking=confirmed(user);
        assertTrue(deliveries.candidates(LocalDate.now(),OffsetDateTime.now(),org.springframework.data.domain.PageRequest.of(0,100)).contains(booking.getId()));
        var delivery=new BookingDelivery(); delivery.bookingId=booking.getId(); delivery.calendarStatus=BookingStatus.CONFIRMED; deliveries.save(delivery);
        assertFalse(deliveries.candidates(LocalDate.now(),OffsetDateTime.now(),org.springframework.data.domain.PageRequest.of(0,100)).contains(booking.getId()));
    }

    @Test void ownerCrudAndAccessRestrictionsRoundTrip() throws Exception {
        var owner=user(); owner.setRole("COURT_OWNER"); users.save(owner); var outsider=user();
        String facilityJson="{\"name\":\"Cơ sở kiểm thử\",\"district\":\"Cầu Giấy\",\"city\":\"Hà Nội\",\"address\":\"123 Cầu Giấy\",\"openTime\":\"05:00\",\"closeTime\":\"23:59\",\"phone\":\"0987654321\"}";
        var result=mvc.perform(post("/api/owner/facilities").header("Authorization",bearer(owner)).contentType("application/json").content(facilityJson))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.courts.length()").value(2)).andReturn();
        var mapper=new tools.jackson.databind.ObjectMapper(); var created=mapper.readTree(result.getResponse().getContentAsString());
        long id=created.path("id").asLong(), court=created.path("courts").get(0).path("id").asLong();
        mvc.perform(put("/api/owner/facilities/"+id).header("Authorization",bearer(owner)).contentType("application/json").content(facilityJson.replace("Cơ sở kiểm thử","Cơ sở đã sửa")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Cơ sở đã sửa"));
        mvc.perform(get("/api/owner/facilities").header("Authorization",bearer(outsider))).andExpect(status().isForbidden());
        String pricing="{\"name\":\"Giờ tối\",\"startTime\":\"17:00\",\"endTime\":\"22:00\",\"dayType\":\"ALL\",\"customerType\":\"CASUAL\",\"pricePerSlot\":120000,\"slotDurationMinutes\":60}";
        var priceResult=mvc.perform(post("/api/owner/facilities/"+id+"/price-rules").header("Authorization",bearer(owner)).contentType("application/json").content(pricing))
            .andExpect(status().isCreated()).andReturn();
        long rule=mapper.readTree(priceResult.getResponse().getContentAsString()).path("id").asLong();
        mvc.perform(put("/api/owner/price-rules/"+rule).header("Authorization",bearer(owner)).contentType("application/json").content(pricing.replace("120000","130000")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pricePerSlot").value(130000));
        String block="{\"courtId\":"+court+",\"date\":\""+LocalDate.now().plusDays(2)+"\",\"startTime\":\"13:00\",\"endTime\":\"14:00\",\"reason\":\"Kiểm thử bảo trì\"}";
        var blockResult=mvc.perform(post("/api/owner/facilities/"+id+"/maintenance").header("Authorization",bearer(owner)).contentType("application/json").content(block))
            .andExpect(status().isCreated()).andReturn();
        long blockId=mapper.readTree(blockResult.getResponse().getContentAsString()).get(0).path("id").asLong();
        mvc.perform(delete("/api/owner/maintenance/"+blockId).header("Authorization",bearer(owner))).andExpect(status().isNoContent());
        mvc.perform(delete("/api/owner/price-rules/"+rule).header("Authorization",bearer(owner))).andExpect(status().isNoContent());
        mvc.perform(get("/api/owner/dashboard").header("Authorization",bearer(owner)).param("facilityId",Long.toString(id)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalCourtsCount").value(2)).andExpect(jsonPath("$.dailyRevenue").isArray());
        mvc.perform(delete("/api/owner/facilities/"+id).header("Authorization",bearer(owner))).andExpect(status().isNoContent());
        assertFalse(facilities.existsById(id));
        assertFalse(courts.existsById(court));
    }
}
