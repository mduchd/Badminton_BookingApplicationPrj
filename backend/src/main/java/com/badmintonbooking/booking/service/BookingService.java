package com.badmintonbooking.booking.service;

import com.badmintonbooking.admin.service.SystemSettingService;
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
import com.badmintonbooking.booking.websocket.SlotEventPublisher;
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
import org.springframework.beans.factory.annotation.Autowired;
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
    private final SlotEventPublisher slotEventPublisher;
    private SystemSettingService systemSettingService;

    public BookingService(BookingRepository bookingRepository,
                          CourtOccupancyRepository occupancyRepository,
                          CourtRepository courtRepository,
                          FacilityRepository facilityRepository,
                          UserRepository userRepository,
                          AvailabilityService availabilityService,
                          SlotEventPublisher slotEventPublisher) {
        this.bookingRepository = bookingRepository;
        this.occupancyRepository = occupancyRepository;
        this.courtRepository = courtRepository;
        this.facilityRepository = facilityRepository;
        this.userRepository = userRepository;
        this.availabilityService = availabilityService;
        this.slotEventPublisher = slotEventPublisher;
    }

    @Autowired(required = false)
    public void setSystemSettingService(SystemSettingService systemSettingService) {
        this.systemSettingService = systemSettingService;
    }

    public BookingResponse createHeldBooking(BookingCreateRequest request) {
        Long cid = request.customerId() != null ? request.customerId() : 1L;
        return createHeldBooking(request, cid);
    }

    @Transactional
    public BookingResponse createHeldBooking(BookingCreateRequest request, Long customerId) {
        // 0. Kiểm tra chế độ bảo trì toàn hệ thống
        if (systemSettingService != null && systemSettingService.isMaintenanceMode()) {
            throw new BadRequestException("Hệ thống đang trong chế độ bảo trì định kỳ. Quý khách vui lòng thử lại sau ít phút!");
        }

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

        // Kiểm tra trạng thái vận hành của Cụm sân
        if (!"ACTIVE".equalsIgnoreCase(facility.getStatus())) {
            throw new BadRequestException("Cụm sân \"" + facility.getName() + "\" hiện đang tạm ngưng hoạt động hoặc chưa được phê duyệt, không thể đặt sân!");
        }

        // Kiểm tra trạng thái vận hành của Sân con
        if (!"ACTIVE".equalsIgnoreCase(court.getStatus())) {
            throw new BadRequestException("Sân con \"" + court.getName() + "\" hiện đang bảo trì hoặc tạm ngưng hoạt động, không thể đặt sân!");
        }

        Long effectiveCustomerId = customerId != null ? customerId : (request.customerId() != null ? request.customerId() : 1L);
        if (!userRepository.existsById(effectiveCustomerId)) {
            throw new ResourceNotFoundException("Không tìm thấy tài khoản khách hàng với id: " + effectiveCustomerId);
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
        // Lấy thời gian giữ chỗ thực tế do Admin cấu hình (mặc định 10 phút)
        int effectiveHoldMinutes = systemSettingService != null
                ? systemSettingService.getEffectiveHoldMinutes()
                : holdDurationMinutes;

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime holdExpiresAt = now.plusMinutes(effectiveHoldMinutes);

        Booking booking = new Booking();
        booking.setCustomerId(effectiveCustomerId);
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

        log.info("Booking HELD created successfully: id={}, court={}, price={}, expiresAt={} (holdDuration={}m)",
                savedBooking.getId(), court.getId(), savedBooking.getTotalAmount(), holdExpiresAt, effectiveHoldMinutes);

        // Phát sự kiện WebSocket STOMP
        slotEventPublisher.publishSlotChange(
                facility.getId(),
                court.getId(),
                request.bookingDate(),
                request.startTime(),
                request.endTime(),
                "HELD",
                "Khung giờ đã được giữ chỗ"
        );

        return toResponse(savedBooking, court.getName(), facility.getName(), facility.getAddress());
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

    @Transactional(readOnly = true)
    public BookingResponse getBookingById(Long id, Long customerId) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt sân"));
        if (customerId != null && !customerId.equals(booking.getCustomerId())) {
            throw new ResourceNotFoundException("Không tìm thấy đơn đặt sân");
        }
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

        // Phát sự kiện WebSocket STOMP nhả slot
        slotEventPublisher.publishSlotChange(
                booking.getFacilityId(),
                booking.getCourtId(),
                booking.getBookingDate(),
                booking.getStartTime(),
                booking.getEndTime(),
                "RELEASED",
                "Khung giờ đã được giải phóng do người dùng hủy đơn"
        );

        log.info("Booking cancelled & occupancy released: id={}", id);
        return toResponseWithLookups(booking);
    }

    private BookingResponse toResponseWithLookups(Booking b) {
        String courtName = courtRepository.findById(b.getCourtId()).map(Court::getName).orElse("Sân " + b.getCourtId());
        Facility facility = facilityRepository.findById(b.getFacilityId()).orElse(null);
        String facilityName = facility != null ? facility.getName() : "Cụm sân " + b.getFacilityId();
        String facilityAddress = facility != null ? facility.getAddress() : null;
        return toResponse(b, courtName, facilityName, facilityAddress);
    }

    private BookingResponse toResponse(Booking b, String courtName, String facilityName, String facilityAddress) {
        String googleCalendarUrl = GoogleCalendarHelper.buildGoogleCalendarUrl(
                b.getId(),
                courtName,
                facilityName,
                facilityAddress,
                b.getBookingDate(),
                b.getStartTime(),
                b.getEndTime(),
                b.getTotalAmount() != null ? b.getTotalAmount().toPlainString() : "0"
        );

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
                b.getCreatedAt(),
                googleCalendarUrl
        );
    }
}
