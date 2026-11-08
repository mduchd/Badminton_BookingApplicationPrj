package com.badmintonbooking.user.auth.controller;

import com.badmintonbooking.common.ApiResponse;
import com.badmintonbooking.user.auth.dto.AuthResponse;
import com.badmintonbooking.user.auth.dto.LoginRequest;
import com.badmintonbooking.user.auth.dto.PhoneLoginRequest;
import com.badmintonbooking.user.auth.dto.PhoneOtpVerifyRequest;
import com.badmintonbooking.user.auth.service.PhoneOtpService;
import com.badmintonbooking.user.auth.dto.RegisterRequest;
import com.badmintonbooking.user.auth.dto.UserResponse;
import com.badmintonbooking.user.auth.service.AuthService;
import com.badmintonbooking.user.auth.service.GoogleTokenVerifier;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final PhoneOtpService phoneOtpService;

    public AuthController(AuthService authService, GoogleTokenVerifier googleTokenVerifier, PhoneOtpService phoneOtpService) {
        this.authService = authService;
        this.googleTokenVerifier = googleTokenVerifier;
        this.phoneOtpService = phoneOtpService;
    }

    public record GoogleLoginRequest(@NotBlank String credential) {}

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> google(@Valid @RequestBody GoogleLoginRequest request) {
        try {
            return ResponseEntity.ok(ApiResponse.success(authService.loginWithGoogle(googleTokenVerifier.verify(request.credential())), "Đăng nhập thành công"));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(ApiResponse.success(response, "Đăng nhập thành công"));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi hệ thống khi đăng nhập"));
        }
    }

    @PostMapping("/login/phone")
    public ResponseEntity<ApiResponse<PhoneOtpService.ChallengeResponse>> loginByPhone(@Valid @RequestBody PhoneLoginRequest request) {
        try {
            return ResponseEntity.ok(ApiResponse.success(phoneOtpService.start(request), "Đã gửi mã xác minh"));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error("Không thể gửi mã xác minh"));
        }
    }

    @PostMapping("/login/phone/verify")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyPhone(@Valid @RequestBody PhoneOtpVerifyRequest request) {
        try {
            return ResponseEntity.ok(ApiResponse.success(phoneOtpService.complete(request.challengeId(), request.code()), "Đăng nhập thành công"));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error("Không thể xác minh mã"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(response, "Đăng ký tài khoản thành công"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi hệ thống khi đăng ký"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        try {
            UserResponse response = authService.getProfileByToken(authHeader);
            return ResponseEntity.ok(ApiResponse.success(response, "Lấy thông tin người dùng thành công"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Lỗi khi xác thực token"));
        }
    }
}
