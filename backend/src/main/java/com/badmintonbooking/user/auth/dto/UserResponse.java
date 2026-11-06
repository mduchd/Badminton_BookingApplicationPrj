package com.badmintonbooking.user.auth.dto;

import com.badmintonbooking.user.entity.User;

public record UserResponse(
    Long id,
    String email,
    String fullName,
    String phone,
    String avatarUrl,
    String role,
    String provider,
    boolean fcmEnabled,
    boolean calendarConnected,
    String calendarEmail
) {
    public static UserResponse fromEntity(User user) {
        return new UserResponse(
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.getPhone(),
            user.getAvatarUrl(),
            user.getRole(),
            user.getProvider(),
            user.isFcmEnabled(),
            user.isCalendarConnected(),
            user.getCalendarEmail()
        );
    }
}
