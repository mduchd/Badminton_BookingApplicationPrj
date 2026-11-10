package com.badmintonbooking.user.integration;
import jakarta.persistence.*;
@Entity @Table(name="user_push_subscriptions")
public class PushSubscription {
    @Id @Column(length=64) public String hash;
    @Column(name="user_id",nullable=false) public Long userId;
    @Column(nullable=false,columnDefinition="TEXT") public String token;
    public PushSubscription() {}
}
