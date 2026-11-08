package com.badmintonbooking.admin.service;

import com.badmintonbooking.admin.dto.*;
import com.badmintonbooking.admin.entity.SystemSetting;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final SystemSettingService systemSettingService;

    public AdminService(
            UserRepository userRepository,
            FacilityRepository facilityRepository,
            CourtRepository courtRepository,
            BookingRepository bookingRepository,
            PaymentRepository paymentRepository,
            SystemSettingService systemSettingService
    ) {
        this.userRepository = userRepository;
        this.facilityRepository = facilityRepository;
        this.courtRepository = courtRepository;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.systemSettingService = systemSettingService;
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

        double currentCommissionRate = systemSettingService.getEffectiveCommissionRate();

        List<Payment> payments = paymentRepository.findAll();
        List<Payment> successPayments = payments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .toList();

        BigDecimal totalGmv = successPayments.stream()
                .map(Payment::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Doanh thu sàn lấy từ snapshot hoa hồng thực tế tại thời điểm giao dịch
        BigDecimal platformRevenue = successPayments.stream()
                .map(p -> {
                    if (p.getCommissionAmount() != null) {
                        return p.getCommissionAmount();
                    }
                    if (p.getAmount() != null) {
                        double rate = p.getCommissionRate() != null ? p.getCommissionRate() : currentCommissionRate;
                        return p.getAmount().multiply(BigDecimal.valueOf(rate / 100.0)).setScale(2, RoundingMode.HALF_UP);
                    }
                    return BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Top 10 giao dịch gần nhất (Batch loading tối ưu để không bị N+1)
        List<Payment> top10Payments = payments.stream()
                .sorted(Comparator.comparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .toList();
        List<AdminTransactionDto> recentTransactions = toBatchTransactionDtos(top10Payments, currentCommissionRate);

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
                currentCommissionRate,
                recentTransactions,
                bookingsByDistrict
        );
    }

    /**
     * Danh sách Cụm sân cho Admin kiểm duyệt (Tối ưu batch load, hiển thị đúng dữ liệu thực)
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
                            f.getRejectionReason(),
                            f.getCreatedAt(),
                            f.getUpdatedAt()
                    );
                })
                .sorted(Comparator.comparing(AdminFacilityDto::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    /**
     * Phê duyệt hoặc từ chối kiểm duyệt cơ sở (Lưu lý do từ chối vào Database)
     */
    @Transactional
    public AdminFacilityDto updateFacilityApproval(Long facilityId, AdminFacilityApprovalRequest request) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cụm sân #" + facilityId));

        String action = request.action().toUpperCase();
        if ("APPROVE".equals(action)) {
            facility.setStatus("ACTIVE");
            facility.setRejectionReason(null);
            facility.setUpdatedAt(OffsetDateTime.now());
            facilityRepository.save(facility);
            log.info("Admin [{}] đã phê duyệt cụm sân #{} - {}", getCurrentAdminEmail(), facilityId, facility.getName());
        } else if ("REJECT".equals(action)) {
            facility.setStatus("REJECTED");
            facility.setRejectionReason(request.rejectionReason() != null ? request.rejectionReason().trim() : "Hồ sơ chưa đạt tiêu chuẩn");
            facility.setUpdatedAt(OffsetDateTime.now());
            facilityRepository.save(facility);
            log.info("Admin [{}] đã từ chối cụm sân #{} - Lý do: {}", getCurrentAdminEmail(), facilityId, facility.getRejectionReason());
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
                facility.getRejectionReason(),
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

        log.info("Admin [{}] đã cập nhật trạng thái cụm sân #{} sang: {} (Lý do: {})",
                getCurrentAdminEmail(), facilityId, targetStatus, request.reason());

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
                facility.getRejectionReason(),
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
     * Cập nhật vai trò tài khoản (Có cơ chế bảo vệ Admin không tự hạ quyền & bảo vệ Admin cuối cùng)
     */
    @Transactional
    public AdminUserDto updateUserRole(Long userId, AdminUserRoleRequest request) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng #" + userId));

        String targetRole = request.role().toUpperCase();
        if (!List.of("CUSTOMER", "COURT_OWNER", "SYSTEM_ADMIN").contains(targetRole)) {
            throw new BadRequestException("Vai trò không hợp lệ: " + targetRole);
        }

        String operatorEmail = getCurrentAdminEmail();
        User operator = operatorEmail != null ? userRepository.findByEmail(operatorEmail).orElse(null) : null;

        // 1. Chặn Admin tự hạ quyền của chính mình
        if (operator != null && operator.getId().equals(userId)) {
            if (!List.of("SYSTEM_ADMIN", "ADMIN").contains(targetRole)) {
                throw new BadRequestException("Bạn không thể tự hạ quyền quản trị của chính mình!");
            }
        }

        // 2. Chặn hạ quyền SYSTEM_ADMIN cuối cùng
        boolean isCurrentlyAdmin = "SYSTEM_ADMIN".equalsIgnoreCase(targetUser.getRole()) || "ADMIN".equalsIgnoreCase(targetUser.getRole());
        boolean willNotBeAdmin = !List.of("SYSTEM_ADMIN", "ADMIN").contains(targetRole);

        if (isCurrentlyAdmin && willNotBeAdmin) {
            long activeAdminCount = countActiveAdmins();
            if (activeAdminCount <= 1) {
                throw new BadRequestException("Hệ thống phải có ít nhất một Quản trị viên hệ thống (SYSTEM_ADMIN) đang hoạt động! Thao tác hạ quyền bị từ chối.");
            }
        }

        targetUser.setRole(targetRole);
        targetUser.setUpdatedAt(OffsetDateTime.now());
        userRepository.save(targetUser);

        log.info("Audit: Admin [{}] đã thay đổi vai trò tài khoản #{} ({}) sang: {}",
                operatorEmail, userId, targetUser.getEmail(), targetRole);

        return new AdminUserDto(
                targetUser.getId(),
                targetUser.getFullName(),
                targetUser.getEmail(),
                targetUser.getPhone(),
                targetUser.getRole(),
                targetUser.getStatus(),
                targetUser.getProvider(),
                targetUser.getCreatedAt()
        );
    }

    /**
     * Khóa hoặc mở khóa tài khoản (Có cơ chế bảo vệ Admin không tự khóa & bảo vệ Admin cuối cùng)
     */
    @Transactional
    public AdminUserDto updateUserStatus(Long userId, AdminUserStatusRequest request) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng #" + userId));

        String targetStatus = request.status().toUpperCase();
        if (!List.of("ACTIVE", "LOCKED").contains(targetStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + targetStatus + " (chỉ chấp nhận ACTIVE hoặc LOCKED)");
        }

        String operatorEmail = getCurrentAdminEmail();
        User operator = operatorEmail != null ? userRepository.findByEmail(operatorEmail).orElse(null) : null;

        // 1. Chặn Admin tự khóa tài khoản của chính mình
        if (operator != null && operator.getId().equals(userId)) {
            if ("LOCKED".equalsIgnoreCase(targetStatus)) {
                throw new BadRequestException("Bạn không thể tự khóa tài khoản quản trị của chính mình!");
            }
        }

        // 2. Chặn khóa SYSTEM_ADMIN cuối cùng
        boolean isTargetAdmin = "SYSTEM_ADMIN".equalsIgnoreCase(targetUser.getRole()) || "ADMIN".equalsIgnoreCase(targetUser.getRole());
        if (isTargetAdmin && "LOCKED".equalsIgnoreCase(targetStatus)) {
            long activeAdminCount = countActiveAdmins();
            if (activeAdminCount <= 1) {
                throw new BadRequestException("Hệ thống phải có ít nhất một Quản trị viên hệ thống (SYSTEM_ADMIN) đang hoạt động! Không thể khóa quản trị viên cuối cùng.");
            }
        }

        targetUser.setStatus(targetStatus);
        targetUser.setUpdatedAt(OffsetDateTime.now());
        userRepository.save(targetUser);

        log.info("Audit: Admin [{}] đã cập nhật trạng thái tài khoản #{} ({}) sang: {} (Lý do: {})",
                operatorEmail, userId, targetUser.getEmail(), targetStatus, request.reason());

        return new AdminUserDto(
                targetUser.getId(),
                targetUser.getFullName(),
                targetUser.getEmail(),
                targetUser.getPhone(),
                targetUser.getRole(),
                targetUser.getStatus(),
                targetUser.getProvider(),
                targetUser.getCreatedAt()
        );
    }

    /**
     * Danh sách giao dịch toàn hệ thống (Tối ưu Batch Loading - Giải quyết triệt để N+1 Queries)
     */
    @Transactional(readOnly = true)
    public List<AdminTransactionDto> getTransactions(String search, String provider, String status) {
        List<Payment> list = paymentRepository.findAll();
        double currentCommissionRate = systemSettingService.getEffectiveCommissionRate();

        List<AdminTransactionDto> dtos = toBatchTransactionDtos(list, currentCommissionRate);

        return dtos.stream()
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
     * Lấy cài đặt hệ thống (Đọc từ Database)
     */
    @Transactional(readOnly = true)
    public AdminSystemSettingsDto getSystemSettings() {
        SystemSetting s = systemSettingService.getSetting();
        List<String> amenities = parseAmenities(s.getSystemAmenitiesJson());

        return new AdminSystemSettingsDto(
                s.getCommissionRatePercent(),
                s.getHoldMinutes(),
                s.getPlatformName(),
                s.getHotline(),
                s.getSupportEmail(),
                s.getBroadcastAnnouncement(),
                Boolean.TRUE.equals(s.getMaintenanceMode()),
                amenities
        );
    }

    /**
     * Cập nhật cài đặt hệ thống (Lưu trực tiếp vào Database, tác động tức thì lên toàn sàn)
     */
    @Transactional
    public AdminSystemSettingsDto updateSystemSettings(AdminSystemSettingsDto request) {
        if (request.commissionRatePercent() < 0 || request.commissionRatePercent() > 50) {
            throw new BadRequestException("Tỷ lệ hoa hồng phải từ 0% đến 50%!");
        }
        if (request.holdMinutes() < 1 || request.holdMinutes() > 60) {
            throw new BadRequestException("Thời gian giữ chỗ phải từ 1 đến 60 phút!");
        }

        SystemSetting s = systemSettingService.getSetting();
        s.setCommissionRatePercent(request.commissionRatePercent());
        s.setHoldMinutes(request.holdMinutes());
        if (request.platformName() != null && !request.platformName().isBlank()) {
            s.setPlatformName(request.platformName());
        }
        if (request.supportHotline() != null) {
            s.setHotline(request.supportHotline());
        }
        if (request.supportEmail() != null) {
            s.setSupportEmail(request.supportEmail());
        }
        if (request.broadcastAnnouncement() != null) {
            s.setBroadcastAnnouncement(request.broadcastAnnouncement());
        }
        s.setMaintenanceMode(request.maintenanceMode());
        if (request.systemAmenities() != null && !request.systemAmenities().isEmpty()) {
            s.setSystemAmenitiesJson(serializeAmenities(request.systemAmenities()));
        }

        String operatorEmail = getCurrentAdminEmail();
        systemSettingService.saveSetting(s, operatorEmail);

        log.info("Audit: Admin [{}] đã cập nhật cấu hình hệ thống: commission={}% holdMinutes={}min maintenance={}",
                operatorEmail, s.getCommissionRatePercent(), s.getHoldMinutes(), s.getMaintenanceMode());

        return getSystemSettings();
    }

    private List<AdminTransactionDto> toBatchTransactionDtos(List<Payment> payments, double currentCommissionRate) {
        if (payments.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Long> bookingIds = payments.stream()
                .map(Payment::getBookingId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, Booking> bookingMap = bookingRepository.findAllById(bookingIds).stream()
                .collect(Collectors.toMap(Booking::getId, b -> b, (a, b) -> a));

        Set<Long> facilityIds = bookingMap.values().stream()
                .map(Booking::getFacilityId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, Facility> facilityMap = facilityRepository.findAllById(facilityIds).stream()
                .collect(Collectors.toMap(Facility::getId, f -> f, (a, b) -> a));

        Set<Long> customerIds = bookingMap.values().stream()
                .map(Booking::getCustomerId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, User> customerMap = userRepository.findAllById(customerIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        List<AdminTransactionDto> dtos = new ArrayList<>();
        for (Payment p : payments) {
            Booking booking = p.getBookingId() != null ? bookingMap.get(p.getBookingId()) : null;
            Facility facility = booking != null && booking.getFacilityId() != null ? facilityMap.get(booking.getFacilityId()) : null;
            User customer = booking != null && booking.getCustomerId() != null ? customerMap.get(booking.getCustomerId()) : null;

            // Sử dụng hoa hồng snapshot từ giao dịch, nếu chưa có thì dùng tỷ lệ tại thời điểm đó
            BigDecimal fee;
            if (p.getCommissionAmount() != null) {
                fee = p.getCommissionAmount();
            } else if (p.getAmount() != null) {
                double rate = p.getCommissionRate() != null ? p.getCommissionRate() : currentCommissionRate;
                fee = p.getAmount().multiply(BigDecimal.valueOf(rate / 100.0)).setScale(2, RoundingMode.HALF_UP);
            } else {
                fee = BigDecimal.ZERO;
            }

            dtos.add(new AdminTransactionDto(
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
            ));
        }

        return dtos;
    }

    private long countActiveAdmins() {
        return userRepository.findAll().stream()
                .filter(u -> ("SYSTEM_ADMIN".equalsIgnoreCase(u.getRole()) || "ADMIN".equalsIgnoreCase(u.getRole()))
                        && "ACTIVE".equalsIgnoreCase(u.getStatus()))
                .count();
    }

    private String getCurrentAdminEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName()))
                ? auth.getName()
                : "SYSTEM_ADMIN";
    }

    private List<String> parseAmenities(String json) {
        if (json == null || json.isBlank()) {
            return List.of("Đèn chiếu sáng BWF", "Điều hòa nhiệt độ", "Bãi đỗ xe", "Phòng tắm nóng lạnh");
        }
        try {
            String clean = json.replace("[", "").replace("]", "").replace("\"", "");
            return Arrays.stream(clean.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        } catch (Exception e) {
            return List.of("Đèn chiếu sáng BWF", "Điều hòa nhiệt độ");
        }
    }

    private String serializeAmenities(List<String> amenities) {
        if (amenities == null || amenities.isEmpty()) {
            return "[]";
        }
        return "[" + amenities.stream().map(a -> "\"" + a.replace("\"", "") + "\"").collect(Collectors.joining(",")) + "]";
    }
}
