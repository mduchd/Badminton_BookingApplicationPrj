package com.badmintonbooking.user.auth.service;

public record GoogleIdentity(String subject, String email, String name) {}
