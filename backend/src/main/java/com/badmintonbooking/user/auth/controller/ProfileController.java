package com.badmintonbooking.user.auth.controller;

import com.badmintonbooking.common.ApiResponse;
import com.badmintonbooking.user.auth.dto.ProfileUpdateRequest;
import com.badmintonbooking.user.auth.dto.UserResponse;
import com.badmintonbooking.user.auth.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api/v1/account")
public class ProfileController {
    private final ProfileService profiles;
    public ProfileController(ProfileService profiles) { this.profiles = profiles; }

    @PatchMapping("/profile")
    public ApiResponse<UserResponse> update(Principal principal, @Valid @RequestBody ProfileUpdateRequest request) {
        return ApiResponse.success(profiles.update(principal, request), "Đã lưu hồ sơ");
    }
}
