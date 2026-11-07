package com.badmintonbooking.booking.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class GoogleCalendarHelper {

    private static final ZoneId ZONE_VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter UTC_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    private GoogleCalendarHelper() {}

    /**
     * Tạo đường dẫn thêm sự kiện vào Google Calendar với 1 click.
     */
    public static String buildGoogleCalendarUrl(Long bookingId, String courtName, String facilityName,
                                                String facilityAddress, LocalDate bookingDate,
                                                LocalTime startTime, LocalTime endTime,
                                                String totalAmount) {
        if (bookingDate == null || startTime == null || endTime == null) {
            return null;
        }

        try {
            ZonedDateTime startVn = bookingDate.atTime(startTime).atZone(ZONE_VN);
            ZonedDateTime endVn = bookingDate.atTime(endTime).atZone(ZONE_VN);

            String startUtcStr = startVn.withZoneSameInstant(ZoneId.of("UTC")).format(UTC_FORMATTER);
            String endUtcStr = endVn.withZoneSameInstant(ZoneId.of("UTC")).format(UTC_FORMATTER);

            String courtDisplay = (courtName != null && !courtName.isBlank()) ? courtName : "Sân cầu lông";
            String facilityDisplay = (facilityName != null && !facilityName.isBlank()) ? facilityName : "SmashCourt";

            String title = URLEncoder.encode("[SmashCourt] " + courtDisplay + " - " + facilityDisplay, StandardCharsets.UTF_8);
            String location = URLEncoder.encode(facilityAddress != null && !facilityAddress.isBlank() ? facilityAddress : facilityDisplay, StandardCharsets.UTF_8);

            String amountText = totalAmount != null ? totalAmount : "0";
            String details = URLEncoder.encode(
                    "Mã đặt sân: #" + bookingId + "\n" +
                    "Sân: " + courtDisplay + "\n" +
                    "Cụm sân: " + facilityDisplay + "\n" +
                    "Thời gian: " + startTime + " - " + endTime + " (" + bookingDate + ")\n" +
                    "Tổng tiền: " + amountText + " VND\n\n" +
                    "Đặt chỗ qua nền tảng SmashCourt Badminton.",
                    StandardCharsets.UTF_8
            );

            return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
                    "&text=" + title +
                    "&dates=" + startUtcStr + "/" + endUtcStr +
                    "&details=" + details +
                    "&location=" + location;
        } catch (Exception e) {
            return null;
        }
    }
}
