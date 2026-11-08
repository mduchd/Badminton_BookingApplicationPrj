package com.badmintonbooking.admin.controller;

import com.badmintonbooking.admin.dto.*;
import com.badmintonbooking.admin.entity.AloBookingFacilityProfile;
import com.badmintonbooking.admin.repository.AloBookingFacilityProfileRepository;
import com.badmintonbooking.admin.service.AdminService;
import com.badmintonbooking.common.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService adminService;

    private final AloBookingFacilityProfileRepository profiles;

    public AdminController(AdminService adminService, AloBookingFacilityProfileRepository profiles) {
        this.adminService = adminService;
        this.profiles = profiles;
    }

    /**
     * Lấy các chỉ số tổng quan vận hành toàn sàn
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AdminDashboardMetricsResponse>> getDashboardMetrics() {
        AdminDashboardMetricsResponse metrics = adminService.getDashboardMetrics();
        return ResponseEntity.ok(ApiResponse.ok(metrics, "Lấy chỉ số tổng quan vận hành sàn thành công"));
    }

    /**
     * Danh sách Cụm sân cho Admin kiểm duyệt & quản trị
     */
    @GetMapping("/facilities")
    public ResponseEntity<ApiResponse<List<AdminFacilityDto>>> getFacilities(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "district", required = false) String district
    ) {
        List<AdminFacilityDto> facilities = adminService.getFacilities(search, status, district);
        return ResponseEntity.ok(ApiResponse.ok(facilities, "Lấy danh sách cụm sân thành công"));
    }

    @GetMapping("/facilities/alobooking-profiles")
    public ApiResponse<List<AloBookingFacilityProfile>> getAloBookingProfiles() {
        return ApiResponse.ok(profiles.findAll(), "Lấy hồ sơ công khai AloBooking thành công");
    }

    /**
     * Phê duyệt hoặc từ chối kiểm duyệt cụm sân
     */
    @PatchMapping("/facilities/{id}/approval")
    public ResponseEntity<ApiResponse<AdminFacilityDto>> updateFacilityApproval(
            @PathVariable("id") Long facilityId,
            @Valid @RequestBody AdminFacilityApprovalRequest request
    ) {
        AdminFacilityDto result = adminService.updateFacilityApproval(facilityId, request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Cập nhật trạng thái kiểm duyệt cụm sân thành công"));
    }

    /**
     * Khóa hoặc mở lại hoạt động của cụm sân
     */
    @PatchMapping("/facilities/{id}/status")
    public ResponseEntity<ApiResponse<AdminFacilityDto>> updateFacilityStatus(
            @PathVariable("id") Long facilityId,
            @Valid @RequestBody AdminFacilityStatusRequest request
    ) {
        AdminFacilityDto result = adminService.updateFacilityStatus(facilityId, request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Cập nhật trạng thái vận hành cụm sân thành công"));
    }

    /**
     * Danh sách toàn bộ người dùng trong hệ thống
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<AdminUserDto>>> getUsers(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "role", required = false) String role,
            @RequestParam(value = "status", required = false) String status
    ) {
        List<AdminUserDto> users = adminService.getUsers(search, role, status);
        return ResponseEntity.ok(ApiResponse.ok(users, "Lấy danh sách người dùng thành công"));
    }

    /**
     * Phân quyền vai trò tài khoản (CUSTOMER, COURT_OWNER, SYSTEM_ADMIN)
     */
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<AdminUserDto>> updateUserRole(
            @PathVariable("id") Long userId,
            @Valid @RequestBody AdminUserRoleRequest request
    ) {
        AdminUserDto result = adminService.updateUserRole(userId, request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Cập nhật phân quyền người dùng thành công"));
    }

    /**
     * Khóa hoặc mở khóa tài khoản người dùng
     */
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<AdminUserDto>> updateUserStatus(
            @PathVariable("id") Long userId,
            @Valid @RequestBody AdminUserStatusRequest request
    ) {
        AdminUserDto result = adminService.updateUserStatus(userId, request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Cập nhật trạng thái tài khoản thành công"));
    }

    /**
     * Danh sách toàn bộ giao dịch thanh toán trên sàn
     */
    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<AdminTransactionDto>>> getTransactions(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "provider", required = false) String provider,
            @RequestParam(value = "status", required = false) String status
    ) {
        List<AdminTransactionDto> transactions = adminService.getTransactions(search, provider, status);
        return ResponseEntity.ok(ApiResponse.ok(transactions, "Lấy danh sách giao dịch thành công"));
    }

    /**
     * Lấy cấu hình hệ thống
     */
    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<AdminSystemSettingsDto>> getSystemSettings() {
        AdminSystemSettingsDto settings = adminService.getSystemSettings();
        return ResponseEntity.ok(ApiResponse.ok(settings, "Lấy cài đặt hệ thống thành công"));
    }

    /**
     * Cập nhật cấu hình hệ thống
     */
    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<AdminSystemSettingsDto>> updateSystemSettings(
            @Valid @RequestBody AdminSystemSettingsDto request
    ) {
        AdminSystemSettingsDto settings = adminService.updateSystemSettings(request);
        return ResponseEntity.ok(ApiResponse.ok(settings, "Cập nhật cài đặt hệ thống thành công"));
    }
}
