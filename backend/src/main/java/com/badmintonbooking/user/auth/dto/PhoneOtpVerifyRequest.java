package com.badmintonbooking.user.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PhoneOtpVerifyRequest(
        @NotBlank @Size(max = 80) String challengeId,
        @NotBlank @Pattern(regexp = "[0-9]{4,10}", message = "Mã xác minh không hợp lệ") String code
) {}
