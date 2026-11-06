package com.badmintonbooking.booking.service;

import com.badmintonbooking.booking.dto.BookingCreateRequest;
import com.badmintonbooking.booking.dto.BookingResponse;
import com.badmintonbooking.booking.dto.CheckAvailabilityResponse;
import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.entity.CourtOccupancy;
import com.badmintonbooking.booking.enums.ActiveStatus;
import com.badmintonbooking.booking.enums.BookingStatus;
import com.badmintonbooking.booking.enums.OccupancyType;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.booking.repository.CourtOccupancyRepository;
import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.common.exception.ResourceNotFoundException;
import com.badmintonbooking.common.exception.SlotConflictException;
import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    @Value("${booking.hold-duration-minutes:10}")
    private int holdDurationMinutes;

    private final BookingRepository bookingRepository;
    private final CourtOccupancyRepository occupancyRepository;
    private final CourtRepository courtRepository;
    private final FacilityRepository facilityRepository;
    private final UserRepository userRepository;
    private final AvailabilityService availabilityService;

    public BookingService(BookingRepository bookingRepository,
                          CourtOccupancyRepository occupancyRepository,
                          CourtRepository courtRepository,
                          FacilityRepository facilityRepository,
                          UserRepository userRepository,
                          AvailabilityService availabilityService) {
        this.bookingRepository = bookingRepository;
        this.occupancyRepository = occupancyRepository;
        this.courtRepository = courtRepository;
        this.facilityRepository = facilityRepository;
        this.userRepository = userRepository;
        this.availabilityService = availabilityService;
    }

    @Transactional
    public BookingResponse createHeldBooking(BookingCreateRequest request) {
        if (!request.startTime().isBefore(request.endTime())) {
            throw new BadRequestException("Giờ bắt đầu phải trước giờ kết thúc!");
        }

        if (request.bookingDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Không thể đặt sân cho ngày trong quá khứ!");
        }

        Court court = courtRepository.findById(request.courtId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân với id: " + request.courtId()));

        Facility facility = facilityRepository.findById(court.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cụm sân"));

        Long customerId = request.customerId() != null ? request.customerId() : 1L;
        if (!userRepository.existsById(customerId)) {
            throw new ResourceNotFoundException("Không tìm thấy tài khoản khách hàng với id: " + customerId);
        }

        // 1. Kiểm tra tính khả dụng của khoảng giờ
        CheckAvailabilityResponse check = availabilityService.checkIntervalAvailability(
                request.courtId(),
                request.bookingDate(),
                request.startTime(),
                request.endTime()
        );

        if (!check.isAvailable()) {
            throw new SlotConflictException("Khung giờ yêu cầu không khả dụng: " + check.reason());
        }

        // 2. Snapshot giá chính xác do backend tự tính (không phụ thuộc client)
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime holdExpiresAt = now.plusMinutes(holdDurationMinutes);

        Booking booking = new Booking();
        booking.setCustomerId(customerId);
        booking.setFacilityId(facility.getId());
        booking.setCourtId(court.getId());
        booking.setBookingDate(request.bookingDate());
        booking.setStartTime(request.startTime());
        booking.setEndTime(request.endTime());
        booking.setTotalAmount(check.calculatedPrice());
        booking.setCurrency("VND");
        booking.setStatus(BookingStatus.HELD);
        booking.setHoldExpiresAt(holdExpiresAt);
        booking.setNote(request.note());
        booking.setCreatedAt(now);
        booking.setUpdatedAt(now);

        Booking savedBooking = bookingRepository.save(booking);

        // 3. Tạo occupancy giữ chỗ (HOLD)
        OffsetDateTime startAt = request.bookingDate().atTime(request.startTime())
                .atZone(AvailabilityService.ZONE_VN).toOffsetDateTime();
        OffsetDateTime endAt = request.bookingDate().atTime(request.endTime())
                .atZone(AvailabilityService.ZONE_VN).toOffsetDateTime();

        CourtOccupancy occupancy = new CourtOccupancy(
                court.getId(),
                savedBooking.getId(),
                startAt,
                endAt,
                OccupancyType.HOLD
        );

        occupancyRepository.save(occupancy);

        log.info("Booking HELD created successfully: id={}, court={}, price={}, expiresAt={}",
                savedBooking.getId(), court.getId(), savedBooking.getTotalAmount(), holdExpiresAt);

        return toResponse(savedBooking, court.getName(), facility.getName());
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings(Long customerId) {
        return bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(this::toResponseWithLookups)
                .toList();
    }

    @Transactional(readOnly = true)
    public BookingResponse getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt sân với id: " + id));
        return toResponseWithLookups(booking);
    }

    @Transactional
    public BookingResponse cancelBooking(Long id, Long customerId) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt sân với id: " + id));

        if (customerId != null && !booking.getCustomerId().equals(customerId)) {
            throw new BadRequestException("Bạn không có quyền hủy đơn đặt sân này!");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return toResponseWithLookups(booking);
        }

        if (booking.getStatus() == BookingStatus.COMPLETED) {
            throw new BadRequestException("Không thể hủy đơn đặt sân đã hoàn thành!");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setUpdatedAt(OffsetDateTime.now());
        bookingRepository.save(booking);

        // Giải phóng tất cả occupancy liên quan
        List<CourtOccupancy> occupancies = occupancyRepository.findByBookingId(id);
        for (CourtOccupancy occ : occupancies) {
            occ.setActiveStatus(ActiveStatus.RELEASED);
            occupancyRepository.save(occ);
        }

        log.info("Booking cancelled & occupancy released: id={}", id);
        return toResponseWithLookups(booking);
    }

    private BookingResponse toResponseWithLookups(Booking b) {
        String courtName = courtRepository.findById(b.getCourtId()).map(Court::getName).orElse("Sân " + b.getCourtId());
        String facilityName = facilityRepository.findById(b.getFacilityId()).map(Facility::getName).orElse("Cụm sân " + b.getFacilityId());
        return toResponse(b, courtName, facilityName);
    }

    private BookingResponse toResponse(Booking b, String courtName, String facilityName) {
        return new BookingResponse(
                b.getId(),
                b.getCustomerId(),
                b.getFacilityId(),
                facilityName,
                b.getCourtId(),
                courtName,
                b.getBookingDate(),
                b.getStartTime(),
                b.getEndTime(),
                b.getTotalAmount(),
                b.getCurrency(),
                b.getStatus(),
                b.getHoldExpiresAt(),
                b.getNote(),
                b.getCreatedAt()
        );
    }
}
