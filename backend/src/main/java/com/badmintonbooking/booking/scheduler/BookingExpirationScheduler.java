package com.badmintonbooking.booking.scheduler;

import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.entity.CourtOccupancy;
import com.badmintonbooking.booking.enums.ActiveStatus;
import com.badmintonbooking.booking.enums.BookingStatus;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.booking.repository.CourtOccupancyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

@Component
public class BookingExpirationScheduler {

    private static final Logger log = LoggerFactory.getLogger(BookingExpirationScheduler.class);

    private final BookingRepository bookingRepository;
    private final CourtOccupancyRepository occupancyRepository;

    public BookingExpirationScheduler(BookingRepository bookingRepository,
                                      CourtOccupancyRepository occupancyRepository) {
        this.bookingRepository = bookingRepository;
        this.occupancyRepository = occupancyRepository;
    }

    @Scheduled(fixedDelay = 30000) // Quét mỗi 30 giây
    @Transactional
    public void sweepExpiredHoldBookings() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Booking> expiredBookings = bookingRepository.findExpiredHolds(
                Set.of(BookingStatus.HELD, BookingStatus.PENDING_PAYMENT),
                now
        );

        if (expiredBookings.isEmpty()) {
            return;
        }

        log.info("Found {} expired booking holds to release", expiredBookings.size());

        for (Booking booking : expiredBookings) {
            booking.setStatus(BookingStatus.EXPIRED);
            booking.setUpdatedAt(now);
            bookingRepository.save(booking);

            List<CourtOccupancy> occupancies = occupancyRepository.findByBookingId(booking.getId());
            for (CourtOccupancy occ : occupancies) {
                occ.setActiveStatus(ActiveStatus.RELEASED);
                occupancyRepository.save(occ);
            }

            log.info("Released expired booking hold: id={}, court={}", booking.getId(), booking.getCourtId());
        }
    }
}
