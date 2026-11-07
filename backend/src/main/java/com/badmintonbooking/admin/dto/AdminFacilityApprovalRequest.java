package com.badmintonbooking.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminFacilityApprovalRequest(
        @NotBlank String action, // "APPROVE" or "REJECT"
        String rejectionReason
) {}
