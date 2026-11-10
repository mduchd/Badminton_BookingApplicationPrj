package com.badmintonbooking.user.integration;

import com.badmintonbooking.booking.enums.BookingStatus;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.user.auth.service.PasswordResetService;
import com.badmintonbooking.user.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.data.domain.PageRequest;
import java.time.*;
import java.util.*;

/** Database-backed delivery with leases; provider calls run outside booking transactions. */
@Component
public class BookingIntegrationWorker {
    private final BookingRepository bookings;
    private final BookingDeliveryRepository deliveries;
    private final PushSubscriptionRepository pushes;
    private final CalendarConnectionRepository calendars;
    private final UserRepository users;
    private final GoogleCalendarClient google;
    private final FirebasePushClient firebase;
    private final IntegrationSecretBox secrets;
    private final TransactionTemplate tx;
    private static final ZoneId VIETNAM=ZoneId.of("Asia/Ho_Chi_Minh");
    record Work(Long id, Long userId, BookingStatus status, List<PushSubscription> tokens,
                CalendarConnection calendar, Map<String,Object> event, boolean sendPush, boolean syncCalendar) {}

    public BookingIntegrationWorker(BookingRepository bookings, BookingDeliveryRepository deliveries, PushSubscriptionRepository pushes,
        CalendarConnectionRepository calendars, UserRepository users, GoogleCalendarClient google, FirebasePushClient firebase,
        IntegrationSecretBox secrets, PlatformTransactionManager manager) {
        this.bookings=bookings; this.deliveries=deliveries; this.pushes=pushes; this.calendars=calendars;
        this.users=users; this.google=google; this.firebase=firebase; this.secrets=secrets; this.tx=new TransactionTemplate(manager);
    }
    @Scheduled(fixedDelayString="${app.integrations.poll-ms:60000}",initialDelayString="${app.integrations.initial-delay-ms:30000}")
    public void deliver() {
        if (!firebase.isConfigured() && !(google.isConfigured()&&secrets.isConfigured())) return;
        var ids=tx.execute(status->deliveries.candidates(LocalDate.now(VIETNAM),OffsetDateTime.now(),PageRequest.of(0,25)));
        if (ids==null) return;
        for (Long id:ids) {
            try { process(id); }
            catch (RuntimeException ex) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Integration delivery deferred for booking {}",id); }
        }
    }
    public void process(Long id) {
        Work work=tx.execute(status->claim(id));
        if (work==null) return;
        boolean pushOk=!work.sendPush(), calendarOk=!work.syncCalendar();
        List<String> expired=new ArrayList<>();
        if (work.sendPush()) {
            pushOk=true;
            for (var token:work.tokens()) {
                try { if (!firebase.send(token.token,work.status().name(),work.id())) expired.add(token.hash); }
                catch (Exception ex) { pushOk=false; }
            }
        }
        if (work.syncCalendar() && work.calendar()!=null) {
            try {
                String access=google.refresh(secrets.decrypt(work.calendar().refreshToken));
                google.sync(access,eventId(work.calendar().subject,work.id()),work.event(),work.status()==BookingStatus.CANCELLED);
                calendarOk=true;
            } catch (RuntimeException ex) { calendarOk=false; }
        }
        boolean deliveredPush=pushOk, deliveredCalendar=calendarOk;
        tx.executeWithoutResult(status->{
            bookings.findByIdForUpdate(id).ifPresent(booking->{
                var delivery=deliveries.findById(id).orElseThrow();
                var user=users.findById(work.userId()).orElseThrow();
                if (work.sendPush() && deliveredPush) delivery.pushStatus=work.status();
                if (work.syncCalendar() && deliveredCalendar && calendars.findById(work.userId())
                        .map(c->c.subject.equals(work.calendar().subject)).orElse(false)) delivery.calendarStatus=work.status();
                for (String hash:expired) pushes.findById(hash).filter(p->p.userId.equals(work.userId())).ifPresent(pushes::delete);
                pushes.flush();
                if (!pushes.existsByUserId(user.getId())) { user.setFcmEnabled(false); users.save(user); }
                delivery.lockedUntil=OffsetDateTime.now().plusSeconds(deliveredPush&&deliveredCalendar?0:60);
                deliveries.save(delivery);
            });
        });
    }
    private Work claim(Long id) {
        var booking=bookings.findByIdForUpdate(id).orElse(null);
        if (booking==null || !List.of(BookingStatus.CONFIRMED,BookingStatus.CANCELLED,BookingStatus.COMPLETED).contains(booking.getStatus())) return null;
        var user=users.findById(booking.getCustomerId()).orElseThrow();
        if (!"ACTIVE".equals(user.getStatus())) return null;
        var delivery=deliveries.findById(id).orElseGet(BookingDelivery::new);
        if (delivery.lockedUntil!=null && delivery.lockedUntil.isAfter(OffsetDateTime.now())) return null;
        boolean send=user.isFcmEnabled()&&firebase.isConfigured()&&delivery.pushStatus!=booking.getStatus();
        boolean sync=user.isCalendarConnected()&&google.isConfigured()&&secrets.isConfigured()&&delivery.calendarStatus!=booking.getStatus();
        if (!send&&!sync) return null;
        delivery.bookingId=id; delivery.lockedUntil=OffsetDateTime.now().plusMinutes(5); deliveries.save(delivery);
        Map<String,Object> event=Map.of("summary","Đặt sân: "+booking.getFacility().getName()+" - "+booking.getCourt().getName(),
            "location",Objects.toString(booking.getFacility().getAddress(),""),
            "description","Đơn đặt sân SmashCourt #"+id,
            "start",Map.of("dateTime",booking.getBookingDate().atTime(booking.getStartTime()).atZone(VIETNAM).toOffsetDateTime().toString(),"timeZone",VIETNAM.getId()),
            "end",Map.of("dateTime",booking.getBookingDate().atTime(booking.getEndTime()).atZone(VIETNAM).toOffsetDateTime().toString(),"timeZone",VIETNAM.getId()));
        return new Work(id,user.getId(),booking.getStatus(),send?pushes.findByUserId(user.getId()):List.of(),
            sync?calendars.findById(user.getId()).orElse(null):null,event,send,sync);
    }
    public static String eventId(String subject,Long bookingId) {
        return "smashcourt"+PasswordResetService.hash(subject).substring(0,24)+Long.toString(bookingId,32);
    }
}
