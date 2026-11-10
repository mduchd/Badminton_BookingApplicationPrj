package com.badmintonbooking.user.auth.service;
import org.springframework.mail.SimpleMailMessage;
public record PasswordResetMail(SimpleMailMessage message) {}
