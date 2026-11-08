package com.badmintonbooking.admin;

import com.badmintonbooking.admin.dto.*;
import com.badmintonbooking.admin.entity.SystemSetting;
import com.badmintonbooking.admin.service.AdminService;
import com.badmintonbooking.admin.service.SystemSettingService;
import com.badmintonbooking.booking.entity.Booking;
import com.badmintonbooking.booking.entity.Payment;
import com.badmintonbooking.booking.enums.BookingStatus;
import com.badmintonbooking.booking.enums.PaymentProvider;
import com.badmintonbooking.booking.enums.PaymentStatus;
import com.badmintonbooking.booking.repository.BookingRepository;
import com.badmintonbooking.booking.repository.PaymentRepository;
import com.badmintonbooking.common.exception.BadRequestException;
import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AdminServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private FacilityRepository facilityRepository;
    @Mock
    private CourtRepository courtRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private SystemSettingService systemSettingService;

    private AdminService adminService;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(
                userRepository,
                facilityRepository,
                courtRepository,
                bookingRepository,
                paymentRepository,
                systemSettingService
        );
    }

    @Test
    void testGetDashboardMetrics() {
        when(systemSettingService.getEffectiveCommissionRate()).thenReturn(5.0);

        User u1 = new User();
        u1.setId(1L);
        u1.setRole("CUSTOMER");
        User u2 = new User();
        u2.setId(2L);
        u2.setRole("COURT_OWNER");
        when(userRepository.findAll()).thenReturn(List.of(u1, u2));

        Facility f1 = new Facility();
        f1.setId(10L);
        f1.setName("Cầu Giấy Pro");
        f1.setDistrict("Cầu Giấy");
        f1.setStatus("ACTIVE");
        when(facilityRepository.findAll()).thenReturn(List.of(f1));

        Booking b1 = new Booking();
        b1.setId(100L);
        b1.setFacilityId(10L);
        b1.setStatus(BookingStatus.CONFIRMED);
        when(bookingRepository.findAll()).thenReturn(List.of(b1));

        Payment p1 = new Payment();
        p1.setId(50L);
        p1.setBookingId(100L);
        p1.setAmount(BigDecimal.valueOf(200000));
        p1.setCommissionRate(5.0);
        p1.setCommissionAmount(BigDecimal.valueOf(10000.00));
        p1.setStatus(PaymentStatus.SUCCESS);
        p1.setProvider(PaymentProvider.PAYOS);
        p1.setCreatedAt(OffsetDateTime.now());
        when(paymentRepository.findAll()).thenReturn(List.of(p1));

        AdminDashboardMetricsResponse metrics = adminService.getDashboardMetrics();

        assertNotNull(metrics);
        assertEquals(2, metrics.totalUsers());
        assertEquals(1, metrics.totalCustomers());
        assertEquals(1, metrics.totalCourtOwners());
        assertEquals(1, metrics.totalFacilities());
        assertEquals(1, metrics.activeFacilities());
        assertEquals(1, metrics.totalBookings());
        assertEquals(1, metrics.confirmedBookings());
        assertEquals(BigDecimal.valueOf(200000), metrics.totalGmv());
        assertEquals(BigDecimal.valueOf(10000.00), metrics.platformRevenue()); // Snapshot hoa hồng thực tế 10,000
    }

    @Test
    void testUpdateFacilityApproval() {
        Facility f = new Facility();
        f.setId(1L);
        f.setName("Sân Cầu Lông Ba Đình");
        f.setStatus("PENDING_APPROVAL");

        when(facilityRepository.findById(1L)).thenReturn(Optional.of(f));
        when(facilityRepository.save(any(Facility.class))).thenReturn(f);
        when(courtRepository.findByFacilityId(1L)).thenReturn(List.of(new Court()));

        AdminFacilityApprovalRequest req = new AdminFacilityApprovalRequest("APPROVE", null);
        AdminFacilityDto dto = adminService.updateFacilityApproval(1L, req);

        assertEquals("ACTIVE", dto.status());
        assertTrue(dto.isApproved());
        verify(facilityRepository, times(1)).save(f);
    }

    @Test
    void testUpdateFacilityApprovalReject_savesReason() {
        Facility f = new Facility();
        f.setId(2L);
        f.setName("Sân Hoàn Kiếm");
        f.setStatus("PENDING_APPROVAL");

        when(facilityRepository.findById(2L)).thenReturn(Optional.of(f));
        when(facilityRepository.save(any(Facility.class))).thenReturn(f);
        when(courtRepository.findByFacilityId(2L)).thenReturn(List.of());

        AdminFacilityApprovalRequest req = new AdminFacilityApprovalRequest("REJECT", "Thiếu ảnh các sân con thực tế");
        AdminFacilityDto dto = adminService.updateFacilityApproval(2L, req);

        assertEquals("REJECTED", dto.status());
        assertFalse(dto.isApproved());
        assertEquals("Thiếu ảnh các sân con thực tế", dto.rejectionReason());
        verify(facilityRepository, times(1)).save(f);
    }

    @Test
    void testUpdateUserRole() {
        User u = new User();
        u.setId(5L);
        u.setRole("CUSTOMER");
        u.setFullName("Lê Minh");
        u.setEmail("leminh@example.com");

        when(userRepository.findById(5L)).thenReturn(Optional.of(u));
        when(userRepository.save(any(User.class))).thenReturn(u);

        AdminUserRoleRequest req = new AdminUserRoleRequest("COURT_OWNER");
        AdminUserDto dto = adminService.updateUserRole(5L, req);

        assertEquals("COURT_OWNER", dto.role());
        verify(userRepository, times(1)).save(u);
    }

    @Test
    void testUpdateUserRole_preventDemotingLastAdmin() {
        User adminUser = new User();
        adminUser.setId(99L);
        adminUser.setRole("SYSTEM_ADMIN");
        adminUser.setStatus("ACTIVE");
        adminUser.setEmail("lastadmin@example.com");

        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));
        when(userRepository.findAll()).thenReturn(List.of(adminUser)); // Chỉ có 1 admin duy nhất

        AdminUserRoleRequest req = new AdminUserRoleRequest("CUSTOMER");

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                adminService.updateUserRole(99L, req)
        );
        assertTrue(ex.getMessage().contains("ít nhất một Quản trị viên hệ thống"));
    }
}
