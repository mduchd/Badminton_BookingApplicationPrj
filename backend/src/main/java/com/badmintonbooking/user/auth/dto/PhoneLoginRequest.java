package com.badmintonbooking.user.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PhoneLoginRequest(
        @NotBlank(message = "Số điện thoại không được để trống") @Size(max = 40) String phone,
        @NotBlank(message = "Mật khẩu không được để trống") String password
) {}
