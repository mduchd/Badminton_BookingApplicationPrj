package com.badmintonbooking.user.auth.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {
    @Id @Column(length = 64) public String hash;
    @Column(name = "user_id", nullable = false) public Long userId;
    @Column(name = "expires_at", nullable = false) public OffsetDateTime expiresAt;
    @Column(name = "created_at", nullable = false) public OffsetDateTime createdAt;
    @Column(nullable = false) public boolean used;
    protected PasswordResetToken() {}
    public PasswordResetToken(String hash, Long userId) {
        this.hash = hash; this.userId = userId;
        this.createdAt = OffsetDateTime.now(); this.expiresAt = createdAt.plusMinutes(20);
    }
}
