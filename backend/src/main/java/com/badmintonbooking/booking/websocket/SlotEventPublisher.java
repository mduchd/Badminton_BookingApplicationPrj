package com.badmintonbooking.booking.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;

@Component
public class SlotEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(SlotEventPublisher.class);
    private final SimpMessagingTemplate messagingTemplate;

    public SlotEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishSlotChange(Long facilityId, Long courtId, LocalDate bookingDate,
                                  LocalTime startTime, LocalTime endTime,
                                  String eventType, String message) {
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override public void afterCommit() {
                            send(facilityId, courtId, bookingDate, startTime, endTime, eventType, message);
                        }
                    });
        } else {
            send(facilityId, courtId, bookingDate, startTime, endTime, eventType, message);
        }
    }

    private void send(Long facilityId, Long courtId, LocalDate bookingDate, LocalTime startTime,
                      LocalTime endTime, String eventType, String message) {
        try {
            SlotStatusEvent event = new SlotStatusEvent(
                    facilityId, courtId, bookingDate, startTime, endTime, eventType, message
            );
            // Broadcast đến topic riêng của sân
            messagingTemplate.convertAndSend("/topic/courts/" + courtId + "/slots", event);
            // Broadcast đến topic toàn cụm sân
            if (facilityId != null) {
                messagingTemplate.convertAndSend("/topic/facilities/" + facilityId + "/slots", event);
            }
            log.info("Broadcasted slot event: type={}, court={}, facility={}, date={}, {}-{}",
                    eventType, courtId, facilityId, bookingDate, startTime, endTime);
        } catch (Exception e) {
            log.warn("Không thể phát WebSocket STOMP slot event: {}", e.getMessage());
        }
    }
}
