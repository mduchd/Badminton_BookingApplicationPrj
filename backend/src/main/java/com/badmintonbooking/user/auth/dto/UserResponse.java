package com.badmintonbooking.user.auth.dto;

import com.badmintonbooking.user.model.AuthProvider;
import com.badmintonbooking.user.model.User;
import com.badmintonbooking.user.model.UserRole;

import java.util.UUID;

public record UserResponse(
    UUID id,
    String email,
    String fullName,
    String phone,
    String avatarUrl,
    UserRole role,
    AuthProvider provider,
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
