package com.badmintonbooking.booking;

import com.badmintonbooking.booking.service.GoogleCalendarHelper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

class GoogleCalendarHelperTest {

    @Test
    @DisplayName("TC06: Sinh URL Google Calendar chuẩn xác với múi giờ UTC từ giờ VN")
    void shouldGenerateValidGoogleCalendarUrl() {
        LocalDate date = LocalDate.of(2026, 11, 20);
        LocalTime start = LocalTime.of(18, 0); // 18:00 VN (+7) -> 11:00 UTC
        LocalTime end = LocalTime.of(20, 0);   // 20:00 VN (+7) -> 13:00 UTC

        String url = GoogleCalendarHelper.buildGoogleCalendarUrl(
                123L,
                "Sân 1",
                "Cụm sân Cầu Giấy",
                "123 Cầu Giấy, Hà Nội",
                date,
                start,
                end,
                "280000"
        );

        assertNotNull(url);
        assertTrue(url.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE"));
        // Kiểm tra UTC date format: 20261120T110000Z / 20261120T130000Z
        assertTrue(url.contains("dates=20261120T110000Z/20261120T130000Z"), "URL phải chứa khung thời gian UTC chính xác");
        assertTrue(url.contains("S%C3%A2n+1") || url.contains("S%C3%A2n%201") || url.contains("SmashCourt"), "URL phải chứa tên sân hoặc thương hiệu SmashCourt");
    }

    @Test
    @DisplayName("TC06: Trả về null an toàn khi dữ liệu ngày giờ bị null")
    void shouldReturnNullWhenInputsMissing() {
        assertNull(GoogleCalendarHelper.buildGoogleCalendarUrl(1L, "Sân 1", "CS1", "HN", null, null, null, "100000"));
    }
}
