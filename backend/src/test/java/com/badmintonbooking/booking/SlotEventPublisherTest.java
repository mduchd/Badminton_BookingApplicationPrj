package com.badmintonbooking.booking;

import com.badmintonbooking.booking.websocket.SlotEventPublisher;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.time.*;
import static org.mockito.Mockito.*;

class SlotEventPublisherTest {
    @Test void publishesOnlyAfterCommit() {
        var messaging = mock(SimpMessagingTemplate.class);
        TransactionSynchronizationManager.initSynchronization();
        try {
            new SlotEventPublisher(messaging).publishSlotChange(1L, 2L, LocalDate.of(2027, 1, 1), LocalTime.of(19, 0), LocalTime.of(20, 0), "HELD", "test");
            verifyNoInteractions(messaging);
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCommit());
            verify(messaging).convertAndSend(eq("/topic/courts/2/slots"), any(Object.class));
            verify(messaging).convertAndSend(eq("/topic/facilities/1/slots"), any(Object.class));
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }
}
