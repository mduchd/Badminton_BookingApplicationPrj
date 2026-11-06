package com.badmintonbooking.common.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.util.TimeZone;

@Configuration
public class DateTimeConfig {

    public static final String TIMEZONE_VN = "Asia/Ho_Chi_Minh";

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone(TIMEZONE_VN));
    }
}
