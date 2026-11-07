package com.badmintonbooking.admin.service;

import com.badmintonbooking.admin.dto.*;
import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.entity.Payment;
import com.badmintonbooking.booking.enums.BookingStatus;
import com.badmintonbooking.booking.enums.PaymentStatus;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.booking.repository.PaymentRepository;
import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.common.exception.ResourceNotFoundException;
import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);

    private final UserRepository userRepository;
    private final FacilityRepository facilityRepository;
    private final CourtRepository courtRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    // Cấu hình nền tảng lưu trữ bộ nhớ có thể cập nhật
    private double commissionRatePercent = 5.0; // 5% phí hoa hồng sàn
    private int holdMinutes = 10; // 10 phút giữ chỗ
    private String broadcastAnnouncement = "Chào mừng đến với Nền tảng Đặt sân Cầu lông Toàn quốc SmashCourt!";
    private boolean maintenanceMode = false;
    private List<String> systemAmenities = new ArrayList<>(List.of(
            "Đèn chiếu sáng tiêu chuẩn BWF",
            "Điều hòa nhiệt độ",
            "Bãi đỗ xe ô tô & xe máy",
            "Căn tin giải khát & quầy đồ ăn",
            "Dịch vụ cho thuê vợt & bán quả cầu",
            "Wifi tốc độ cao miễn phí",
            "Tủ đồ cá nhân an toàn",
            "Phòng tắm & thay đồ nóng lạnh"
    ));

    public AdminService(
            UserRepository userRepository,
            FacilityRepository facilityRepository,
            CourtRepository courtRepository,
            BookingRepository bookingRepository,
            PaymentRepository paymentRepository
    ) {
        this.userRepository = userRepository;
        this.facilityRepository = facilityRepository;
        this.courtRepository = courtRepository;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
    }

    /**
     * Lấy các chỉ số vận hành tổng thể toàn sàn
     */
    @Transactional(readOnly = true)
    public AdminDashboardMetricsResponse getDashboardMetrics() {
        List<User> users = userRepository.findAll();
        long totalUsers = users.size();
        long totalCustomers = users.stream().filter(u -> "CUSTOMER".equalsIgnoreCase(u.getRole())).count();
        long totalCourtOwners = users.stream().filter(u -> "COURT_OWNER".equalsIgnoreCase(u.getRole()) || "OWNER".equalsIgnoreCase(u.getRole())).count();
        long totalAdmins = users.stream().filter(u -> "SYSTEM_ADMIN".equalsIgnoreCase(u.getRole()) || "ADMIN".equalsIgnoreCase(u.getRole())).count();

        List<Facility> facilities = facilityRepository.findAll();
        long totalFacilities = facilities.size();
        long activeFacilities = facilities.stream().filter(f -> "ACTIVE".equalsIgnoreCase(f.getStatus())).count();
        long pendingFacilities = facilities.stream().filter(f -> "PENDING_APPROVAL".equalsIgnoreCase(f.getStatus())).count();
        long pausedFacilities = facilities.stream().filter(f -> "PAUSED".equalsIgnoreCase(f.getStatus()) || "SUSPENDED".equalsIgnoreCase(f.getStatus())).count();

        List<Booking> bookings = bookingRepository.findAll();
        long totalBookings = bookings.size();
        long confirmedBookings = bookings.stream().filter(b -> b.getStatus() == BookingStatus.CONFIRMED).count();
        long cancelledBookings = bookings.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED || b.getStatus() == BookingStatus.EXPIRED).count();

        List<Payment> payments = paymentRepository.findAll();
        BigDecimal totalGmv = payments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .map(Payment::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal platformRevenue = totalGmv.multiply(BigDecimal.valueOf(commissionRatePercent / 100.0))
                .setScale(2, RoundingMode.HALF_UP);

        // Top 10 giao dịch gần nhất
        List<AdminTransactionDto> recentTransactions = payments.stream()
                .sorted(Comparator.comparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .map(this::toTransactionDto)
                .collect(Collectors.toList());

        // Phân bổ đơn đặt theo quận
        Map<String, Long> bookingsByDistrict = new HashMap<>();
        Map<Long, String> facilityDistrictMap = facilities.stream()
                .collect(Collectors.toMap(Facility::getId, f -> f.getDistrict() != null ? f.getDistrict() : "Khác", (a, b) -> a));

        for (Booking b : bookings) {
            String district = facilityDistrictMap.getOrDefault(b.getFacilityId(), "Khác");
            bookingsByDistrict.put(district, bookingsByDistrict.getOrDefault(district, 0L) + 1);
        }

        return new AdminDashboardMetricsResponse(
                totalUsers,
                totalCustomers,
                totalCourtOwners,
                totalAdmins,
                totalFacilities,
                activeFacilities,
                pendingFacilities,
                pausedFacilities,
                totalBookings,
                confirmedBookings,
                cancelledBookings,
                totalGmv,
                platformRevenue,
                commissionRatePercent,
                recentTransactions,
                bookingsByDistrict
        );
    }

    /**
     * Danh sách Cụm sân cho Admin kiểm duyệt
     */
    @Transactional(readOnly = true)
    public List<AdminFacilityDto> getFacilities(String search, String status, String district) {
        List<Facility> list = facilityRepository.findAll();

        Map<Long, User> ownerMap = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        Map<Long, List<Court>> courtMap = courtRepository.findAll().stream()
                .collect(Collectors.groupingBy(Court::getFacilityId));

        return list.stream()
                .filter(f -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase();
                        boolean matchName = f.getName() != null && f.getName().toLowerCase().contains(s);
                        boolean matchAddress = f.getAddress() != null && f.getAddress().toLowerCase().contains(s);
                        if (!matchName && !matchAddress) return false;
                    }
                    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                        if (!status.equalsIgnoreCase(f.getStatus())) return false;
                    }
                    if (district != null && !district.isBlank() && !"ALL".equalsIgnoreCase(district)) {
                        if (f.getDistrict() == null || !f.getDistrict().equalsIgnoreCase(district)) return false;
                    }
                    return true;
                })
                .map(f -> {
                    User owner = f.getOwnerId() != null ? ownerMap.get(f.getOwnerId()) : null;
                    int courtsCount = courtMap.getOrDefault(f.getId(), Collections.emptyList()).size();
                    boolean isApproved = "ACTIVE".equalsIgnoreCase(f.getStatus()) || "PAUSED".equalsIgnoreCase(f.getStatus());
                    return new AdminFacilityDto(
                            f.getId(),
                            f.getOwnerId(),
                            owner != null ? owner.getFullName() : "N/A",
                            owner != null ? owner.getEmail() : "N/A",
                            owner != null ? owner.getPhone() : "N/A",
                            f.getName(),
                            f.getCity(),
                            f.getDistrict(),
                            f.getWard(),
                            f.getAddress(),
                            f.getOpenTime(),
                            f.getCloseTime(),
                            f.getStatus(),
                            isApproved,
                            courtsCount,
                            f.getCreatedAt(),
                            f.getUpdatedAt()
                    );
                })
                .sorted(Comparator.comparing(AdminFacilityDto::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    /**
     * Phê duyệt hoặc từ chối kiểm duyệt cơ sở
     */
    @Transactional
    public AdminFacilityDto updateFacilityApproval(Long facilityId, AdminFacilityApprovalRequest request) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cụm sân #" + facilityId));

        String action = request.action().toUpperCase();
        if ("APPROVE".equals(action)) {
            facility.setStatus("ACTIVE");
            facility.setUpdatedAt(OffsetDateTime.now());
            facilityRepository.save(facility);
            log.info("Admin đã phê duyệt cụm sân #{} - {}", facilityId, facility.getName());
        } else if ("REJECT".equals(action)) {
            facility.setStatus("REJECTED");
            facility.setUpdatedAt(OffsetDateTime.now());
            facilityRepository.save(facility);
            log.info("Admin đã từ chối cụm sân #{} - Lý do: {}", facilityId, request.rejectionReason());
        } else {
            throw new BadRequestException("Hành động không hợp lệ: " + action + " (chỉ chấp nhận APPROVE hoặc REJECT)");
        }

        User owner = facility.getOwnerId() != null ? userRepository.findById(facility.getOwnerId()).orElse(null) : null;
        int courtsCount = courtRepository.findByFacilityId(facilityId).size();
        boolean isApproved = "ACTIVE".equalsIgnoreCase(facility.getStatus());

        return new AdminFacilityDto(
                facility.getId(),
                facility.getOwnerId(),
                owner != null ? owner.getFullName() : "N/A",
                owner != null ? owner.getEmail() : "N/A",
                owner != null ? owner.getPhone() : "N/A",
                facility.getName(),
                facility.getCity(),
                facility.getDistrict(),
                facility.getWard(),
                facility.getAddress(),
                facility.getOpenTime(),
                facility.getCloseTime(),
                facility.getStatus(),
                isApproved,
                courtsCount,
                facility.getCreatedAt(),
                facility.getUpdatedAt()
        );
    }

    /**
     * Khóa hoặc mở lại trạng thái hoạt động của cụm sân
     */
    @Transactional
    public AdminFacilityDto updateFacilityStatus(Long facilityId, AdminFacilityStatusRequest request) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cụm sân #" + facilityId));

        String targetStatus = request.status().toUpperCase();
        facility.setStatus(targetStatus);
        facility.setUpdatedAt(OffsetDateTime.now());
        facilityRepository.save(facility);

        log.info("Admin đã cập nhật trạng thái cụm sân #{} sang: {} (Lý do: {})", facilityId, targetStatus, request.reason());

        User owner = facility.getOwnerId() != null ? userRepository.findById(facility.getOwnerId()).orElse(null) : null;
        int courtsCount = courtRepository.findByFacilityId(facilityId).size();
        boolean isApproved = "ACTIVE".equalsIgnoreCase(facility.getStatus()) || "PAUSED".equalsIgnoreCase(facility.getStatus());

        return new AdminFacilityDto(
                facility.getId(),
                facility.getOwnerId(),
                owner != null ? owner.getFullName() : "N/A",
                owner != null ? owner.getEmail() : "N/A",
                owner != null ? owner.getPhone() : "N/A",
                facility.getName(),
                facility.getCity(),
                facility.getDistrict(),
                facility.getWard(),
                facility.getAddress(),
                facility.getOpenTime(),
                facility.getCloseTime(),
                facility.getStatus(),
                isApproved,
                courtsCount,
                facility.getCreatedAt(),
                facility.getUpdatedAt()
        );
    }

    /**
     * Danh sách tài khoản người dùng cho Admin
     */
    @Transactional(readOnly = true)
    public List<AdminUserDto> getUsers(String search, String role, String status) {
        List<User> list = userRepository.findAll();

        return list.stream()
                .filter(u -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase();
                        boolean matchName = u.getFullName() != null && u.getFullName().toLowerCase().contains(s);
                        boolean matchEmail = u.getEmail() != null && u.getEmail().toLowerCase().contains(s);
                        boolean matchPhone = u.getPhone() != null && u.getPhone().toLowerCase().contains(s);
                        if (!matchName && !matchEmail && !matchPhone) return false;
                    }
                    if (role != null && !role.isBlank() && !"ALL".equalsIgnoreCase(role)) {
                        if (!role.equalsIgnoreCase(u.getRole())) return false;
                    }
                    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                        if (!status.equalsIgnoreCase(u.getStatus())) return false;
                    }
                    return true;
                })
                .map(u -> new AdminUserDto(
                        u.getId(),
                        u.getFullName(),
                        u.getEmail(),
                        u.getPhone(),
                        u.getRole(),
                        u.getStatus(),
                        u.getProvider(),
                        u.getCreatedAt()
                ))
                .sorted(Comparator.comparing(AdminUserDto::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    /**
     * Cập nhật vai trò tài khoản (CUSTOMER, COURT_OWNER, SYSTEM_ADMIN)
     */
    @Transactional
    public AdminUserDto updateUserRole(Long userId, AdminUserRoleRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng #" + userId));

        String targetRole = request.role().toUpperCase();
        if (!List.of("CUSTOMER", "COURT_OWNER", "OWNER", "SYSTEM_ADMIN", "ADMIN").contains(targetRole)) {
            throw new BadRequestException("Vai trò không hợp lệ: " + targetRole);
        }

        user.setRole(targetRole);
        user.setUpdatedAt(OffsetDateTime.now());
        userRepository.save(user);

        log.info("Admin đã thay đổi vai trò tài khoản #{} ({}) sang: {}", userId, user.getEmail(), targetRole);

        return new AdminUserDto(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus(),
                user.getProvider(),
                user.getCreatedAt()
        );
    }

    /**
     * Khóa hoặc mở khóa tài khoản
     */
    @Transactional
    public AdminUserDto updateUserStatus(Long userId, AdminUserStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng #" + userId));

        String targetStatus = request.status().toUpperCase();
        if (!List.of("ACTIVE", "LOCKED").contains(targetStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + targetStatus + " (chỉ chấp nhận ACTIVE hoặc LOCKED)");
        }

        user.setStatus(targetStatus);
        user.setUpdatedAt(OffsetDateTime.now());
        userRepository.save(user);

        log.info("Admin đã cập nhật trạng thái tài khoản #{} ({}) sang: {} (Lý do: {})", userId, user.getEmail(), targetStatus, request.reason());

        return new AdminUserDto(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus(),
                user.getProvider(),
                user.getCreatedAt()
        );
    }

    /**
     * Danh sách giao dịch toàn hệ thống
     */
    @Transactional(readOnly = true)
    public List<AdminTransactionDto> getTransactions(String search, String provider, String status) {
        List<Payment> list = paymentRepository.findAll();

        return list.stream()
                .map(this::toTransactionDto)
                .filter(t -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase();
                        boolean matchCustomer = t.customerName() != null && t.customerName().toLowerCase().contains(s);
                        boolean matchFacility = t.facilityName() != null && t.facilityName().toLowerCase().contains(s);
                        boolean matchRef = t.transactionRef() != null && t.transactionRef().toLowerCase().contains(s);
                        boolean matchOrderCode = t.orderCode() != null && String.valueOf(t.orderCode()).contains(s);
                        if (!matchCustomer && !matchFacility && !matchRef && !matchOrderCode) return false;
                    }
                    if (provider != null && !provider.isBlank() && !"ALL".equalsIgnoreCase(provider)) {
                        if (!provider.equalsIgnoreCase(t.provider())) return false;
                    }
                    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                        if (!status.equalsIgnoreCase(t.status())) return false;
                    }
                    return true;
                })
                .sorted(Comparator.comparing(AdminTransactionDto::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    /**
     * Lấy cài đặt hệ thống
     */
    public AdminSystemSettingsDto getSystemSettings() {
        return new AdminSystemSettingsDto(
                this.commissionRatePercent,
                this.holdMinutes,
                "SmashCourt Badminton Booking Platform",
                "1900 6868",
                "support@smashcourt.vn",
                this.broadcastAnnouncement,
                this.maintenanceMode,
                Collections.unmodifiableList(this.systemAmenities)
        );
    }

    /**
     * Cập nhật cài đặt hệ thống
     */
    public AdminSystemSettingsDto updateSystemSettings(AdminSystemSettingsDto request) {
        if (request.commissionRatePercent() < 0 || request.commissionRatePercent() > 50) {
            throw new BadRequestException("Tỷ lệ hoa hồng phải từ 0% đến 50%!");
        }
        if (request.holdMinutes() < 1 || request.holdMinutes() > 60) {
            throw new BadRequestException("Thời gian giữ chỗ phải từ 1 đến 60 phút!");
        }

        this.commissionRatePercent = request.commissionRatePercent();
        this.holdMinutes = request.holdMinutes();
        if (request.broadcastAnnouncement() != null) {
            this.broadcastAnnouncement = request.broadcastAnnouncement();
        }
        this.maintenanceMode = request.maintenanceMode();
        if (request.systemAmenities() != null && !request.systemAmenities().isEmpty()) {
            this.systemAmenities = new ArrayList<>(request.systemAmenities());
        }

        log.info("Admin đã cập nhật cấu hình hệ thống: commission={}% holdMinutes={}min", this.commissionRatePercent, this.holdMinutes);
        return getSystemSettings();
    }

    private AdminTransactionDto toTransactionDto(Payment p) {
        Booking booking = p.getBookingId() != null ? bookingRepository.findById(p.getBookingId()).orElse(null) : null;
        Facility facility = booking != null && booking.getFacilityId() != null
                ? facilityRepository.findById(booking.getFacilityId()).orElse(null)
                : null;
        User customer = booking != null && booking.getCustomerId() != null
                ? userRepository.findById(booking.getCustomerId()).orElse(null)
                : null;

        BigDecimal fee = p.getAmount() != null
                ? p.getAmount().multiply(BigDecimal.valueOf(commissionRatePercent / 100.0)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new AdminTransactionDto(
                p.getId(),
                p.getBookingId(),
                p.getProviderOrderCode(),
                customer != null ? customer.getFullName() : "Khách vãng lai",
                customer != null ? customer.getPhone() : "N/A",
                facility != null ? facility.getName() : "CLB SmashCourt",
                p.getProvider() != null ? p.getProvider().name() : "MOCK",
                p.getAmount(),
                fee,
                p.getStatus() != null ? p.getStatus().name() : "PENDING",
                p.getTransactionRef(),
                p.getCreatedAt(),
                p.getPaidAt()
        );
    }
}
