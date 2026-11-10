package com.badmintonbooking.user.integration;
import jakarta.persistence.*;
@Entity @Table(name="user_calendar_connections")
public class CalendarConnection {
    @Id @Column(name="user_id") public Long userId;
    @Column(name="refresh_token",nullable=false,columnDefinition="TEXT") public String refreshToken;
    @Column(nullable=false) public String subject;
    public CalendarConnection() {}
}
