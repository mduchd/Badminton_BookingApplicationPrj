package com.badmintonbooking.user.integration;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
@Entity @Table(name="calendar_consents")
public class CalendarConsent {
    @Id @Column(length=64) public String hash;
    @Column(name="user_id",nullable=false) public Long userId;
    @Column(name="expires_at",nullable=false) public OffsetDateTime expiresAt;
    public CalendarConsent() {}
}
