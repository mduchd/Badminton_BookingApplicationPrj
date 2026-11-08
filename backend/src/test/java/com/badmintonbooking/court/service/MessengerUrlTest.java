package com.badmintonbooking.court.service;

import com.badmintonbooking.common.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MessengerUrlTest {
    @Test void acceptsMessengerLinkAndClearsBlank() {
        assertEquals("https://m.me/example.page", MessengerUrl.normalize(" https://m.me/example.page "));
        assertNull(MessengerUrl.normalize("  "));
    }
    @Test void rejectsUnsafeOrUnrelatedLinks() {
        for (String url : new String[]{"javascript:alert(1)", "https://m.me.evil.test/page", "http://m.me/page", "https://m.me/", "https://m.me@evil.test/page"}) {
            assertThrows(BadRequestException.class, () -> MessengerUrl.normalize(url));
        }
    }
}
