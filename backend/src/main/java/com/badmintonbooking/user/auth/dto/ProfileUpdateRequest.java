package com.badmintonbooking.user.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @NotBlank(message = "Họ tên không được để trống") @Size(max = 120) String fullName,
        @Size(max = 30) String phone) {}
