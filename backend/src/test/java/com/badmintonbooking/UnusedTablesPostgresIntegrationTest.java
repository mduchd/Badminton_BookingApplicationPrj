package com.badmintonbooking;

import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/** Checks Flyway's real schema and the ORM metadata after the unused tables are retired. */
@SpringBootTest(properties = {"ai.enabled=false", "app.integrations.initial-delay-ms=3600000"})
@EnabledIfEnvironmentVariable(named = "RUN_POSTGRES_TESTS", matches = "true")
class UnusedTablesPostgresIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManagerFactory entities;

    @Test
    void removesOnlyRetiredTablesAndKeepsActiveIntegrations() {
        Set<String> tables = Set.copyOf(jdbc.queryForList("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                """, String.class));
        assertFalse(tables.contains("booking_calendar_links"));
        assertFalse(tables.contains("alobooking_schedule_slots"));
        assertEquals(20, tables.size(), "19 application tables plus Flyway history");
        assertTrue(tables.containsAll(Set.of("users", "facilities", "courts", "bookings", "payments",
                "court_occupancies", "alobooking_public_facility_profiles", "user_calendar_connections",
                "calendar_consents", "booking_deliveries", "user_push_subscriptions", "flyway_schema_history")));
        Set<String> entityNames = entities.getMetamodel().getEntities().stream()
                .map(entity -> entity.getName()).collect(Collectors.toSet());
        assertFalse(entityNames.contains("BookingCalendarLink"));
    }
}
