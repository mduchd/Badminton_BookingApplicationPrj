package com.badmintonbooking.user.auth.service;

public record GoogleIdentity(String subject, String email, String name, String picture) {
    public GoogleIdentity(String subject, String email, String name) {
        this(subject, email, name, null);
    }
}
