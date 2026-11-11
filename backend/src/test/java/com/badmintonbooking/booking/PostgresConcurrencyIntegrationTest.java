package com.badmintonbooking.booking;

import com.badmintonbooking.court.entity.*;
import com.badmintonbooking.court.repository.*;
import com.badmintonbooking.user.ai.service.AiRateLimiterService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

/** Runs only against the isolated PostgreSQL service in CI/staging, never a production DB. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_POSTGRES_TESTS", matches = "true")
class PostgresConcurrencyIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired FacilityRepository facilities;
    @Autowired CourtRepository courts;
    @Autowired com.badmintonbooking.user.repository.UserRepository users;
    @Autowired com.badmintonbooking.booking.service.BookingIdempotencyService bookingService;

    @Test void realBookingsSerializeRetriesAndCompetingCustomers() throws Exception {
        var facility = new Facility(); facility.setName("Booking concurrency fixture"); facility.setAddress("Isolated test");
        facility.setStatus("ACTIVE"); facility.setIsApproved(true);
        facility = facilities.saveAndFlush(facility);
        var court = new Court(); court.setFacilityId(facility.getId()); court.setName("Concurrent court");
        court = courts.saveAndFlush(court);
        var customers = new ArrayList<Long>();
        for (int i = 0; i < 2; i++) {
            var user = new com.badmintonbooking.user.entity.User();
            user.setEmail(UUID.randomUUID() + "@verification.invalid"); user.setFullName("Verification fixture");
            customers.add(users.saveAndFlush(user).getId());
        }
        var request = new com.badmintonbooking.booking.dto.BookingCreateRequest(court.getId(),
                java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1), java.time.LocalTime.of(19, 0), java.time.LocalTime.of(20, 0), null);
        Long courtId = court.getId(); Long facilityId = facility.getId();
        var pool = Executors.newFixedThreadPool(4);
        try {
            var retries = new ArrayList<Callable<Long>>();
            for (int i = 0; i < 8; i++) retries.add(() -> bookingService.create(request, customers.get(0), "same-attempt-123").id());
            var ids = new HashSet<Long>();
            for (var future : pool.invokeAll(retries)) ids.add(future.get());
            assertEquals(1, ids.size());
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM bookings WHERE court_id = ?", Integer.class, courtId));
            assertThrows(com.badmintonbooking.common.exception.SlotConflictException.class,
                    () -> bookingService.create(request, customers.get(1), "other-customer-123"));

            var raceRequest = new com.badmintonbooking.booking.dto.BookingCreateRequest(courtId, request.bookingDate(),
                    java.time.LocalTime.of(21, 0), java.time.LocalTime.of(22, 0), null);
            var start = new CountDownLatch(1);
            var racers = new ArrayList<Future<Boolean>>();
            for (Long customer : customers) racers.add(pool.submit(() -> {
                start.await();
                try { bookingService.create(raceRequest, customer, "race-attempt-123"); return true; }
                catch (com.badmintonbooking.common.exception.SlotConflictException | org.springframework.dao.DataIntegrityViolationException expected) { return false; }
            }));
            start.countDown();
            int wins = 0; for (var racer : racers) if (racer.get()) wins++;
            assertEquals(1, wins);
            assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM bookings WHERE court_id = ?", Integer.class, courtId));
        } finally {
            pool.shutdownNow();
            jdbc.update("DELETE FROM court_occupancies WHERE court_id = ?", courtId);
            jdbc.update("DELETE FROM bookings WHERE court_id = ?", courtId);
            courts.deleteById(courtId); facilities.deleteById(facilityId);
            for (Long customer : customers) users.deleteById(customer);
        }
    }

    @Test void sharedQuotaIsAtomicAcrossTwoServiceInstances() throws Exception {
        var a = new AiRateLimiterService(); var b = new AiRateLimiterService();
        for (var service : List.of(a, b)) {
            ReflectionTestUtils.setField(service, "jdbc", jdbc);
            ReflectionTestUtils.setField(service, "distributed", true);
        }
        String client = "concurrency-" + UUID.randomUUID();
        var pool = Executors.newFixedThreadPool(8);
        try {
            String minute = jdbc.queryForObject("SELECT date_trunc('minute', CURRENT_TIMESTAMP)::text", String.class);
            var tasks = new ArrayList<Callable<Boolean>>();
            for (int i = 0; i < 40; i++) { var service = i % 2 == 0 ? a : b; tasks.add(() -> service.allowRequest(client)); }
            int accepted = 0;
            for (var result : pool.invokeAll(tasks)) if (result.get()) accepted++;
            org.junit.jupiter.api.Assumptions.assumeTrue(Objects.equals(minute,
                    jdbc.queryForObject("SELECT date_trunc('minute', CURRENT_TIMESTAMP)::text", String.class)), "Fixed-window boundary crossed; rerun this case");
            assertEquals(15, accepted);
            assertEquals(a.getRemainingQuota(client), b.getRemainingQuota(client));
        } finally { pool.shutdownNow(); }
    }

    @Test void exclusionConstraintRejectsOverlappingOccupancy() {
        var facility = new Facility(); facility.setName("Concurrency fixture"); facility.setAddress("Test fixture");
        facility = facilities.saveAndFlush(facility);
        var court = new Court(); court.setFacilityId(facility.getId()); court.setName("Fixture court");
        court = courts.saveAndFlush(court);
        Long courtId = court.getId(); Long facilityId = facility.getId();
        var start = OffsetDateTime.now().plusDays(1); var end = start.plusHours(1);
        String sql = "INSERT INTO court_occupancies(court_id,start_at,end_at,occupancy_type,active_status) VALUES (?,?,?,'MAINTENANCE','ACTIVE')";
        try {
            jdbc.update(sql, courtId, start, end);
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> jdbc.update(sql, courtId, start.plusMinutes(30), end.plusMinutes(30)));
            jdbc.update(sql, courtId, end, end.plusHours(1));
        } finally {
            jdbc.update("DELETE FROM court_occupancies WHERE court_id = ?", courtId);
            courts.deleteById(courtId); facilities.deleteById(facilityId);
        }
    }
}
