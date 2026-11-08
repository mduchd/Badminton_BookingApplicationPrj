package com.badmintonbooking.court.service;

import com.badmintonbooking.common.exception.BadRequestException;
import java.net.URI;

final class MessengerUrl {
    private MessengerUrl() {}
    static String normalize(String input) {
        if (input == null) return null;
        String value = input.trim();
        if (value.isEmpty()) return null;
        try {
            URI uri = URI.create(value);
            if (value.length() > 500 || !"https".equalsIgnoreCase(uri.getScheme()) ||
                !"m.me".equalsIgnoreCase(uri.getHost()) || uri.getUserInfo() != null ||
                uri.getPort() != -1 || uri.getPath() == null || uri.getPath().length() <= 1) {
                throw new IllegalArgumentException();
            }
            return value;
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Liên kết Messenger phải có dạng https://m.me/ten-trang.");
        }
    }
}
