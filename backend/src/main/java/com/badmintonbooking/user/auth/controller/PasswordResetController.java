package com.badmintonbooking.user.auth.controller;

import com.badmintonbooking.common.ApiResponse;
import com.badmintonbooking.user.auth.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;

@RestController
@RequestMapping("/api/v1/auth")
public class PasswordResetController {
    private final PasswordResetService resets;
    // Bounded, per-process abuse limit; do not trust caller-supplied forwarded headers.
    private final Map<String, Deque<Long>> attempts = new LinkedHashMap<>();
    public PasswordResetController(PasswordResetService resets) { this.resets = resets; }
    public record EmailRequest(@NotBlank @Email @Size(max=254) String email) {}
    public record ResetRequest(@NotBlank @Size(max=100) String token, @NotBlank @Size(min=8,max=72) String password) {}

    @GetMapping("/capabilities")
    public ApiResponse<Map<String, Boolean>> capabilities() { return ApiResponse.success(Map.of("passwordReset", resets.isAvailable()), "Cấu hình tài khoản"); }
    @PostMapping("/forgot-password")
    public ApiResponse<Void> request(@Valid @RequestBody EmailRequest request, HttpServletRequest http) {
        limit(http.getRemoteAddr()); resets.request(request.email());
        return ApiResponse.success(null, "Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận được liên kết đặt lại mật khẩu.");
    }
    @PostMapping("/reset-password")
    public ApiResponse<Void> reset(@Valid @RequestBody ResetRequest request, HttpServletRequest http) {
        limit(http.getRemoteAddr()); resets.reset(request.token(), request.password());
        return ApiResponse.success(null, "Đã đổi mật khẩu. Hãy đăng nhập lại.");
    }
    private synchronized void limit(String key) {
        long cutoff = System.currentTimeMillis() - 900_000;
        attempts.entrySet().removeIf(entry -> entry.getValue().isEmpty() || entry.getValue().getLast() < cutoff);
        if (!attempts.containsKey(key) && attempts.size() >= 10_000) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Vui lòng thử lại sau");
        var queue = attempts.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        while (!queue.isEmpty() && queue.getFirst() < cutoff) queue.removeFirst();
        if (queue.size() >= 8) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Bạn đã thử nhiều lần. Vui lòng thử lại sau 15 phút.");
        queue.addLast(System.currentTimeMillis());
    }
}
