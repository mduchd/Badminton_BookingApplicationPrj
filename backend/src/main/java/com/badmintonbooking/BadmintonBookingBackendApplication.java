package com.badmintonbooking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BadmintonBookingBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BadmintonBookingBackendApplication.class, args);
    }

}
