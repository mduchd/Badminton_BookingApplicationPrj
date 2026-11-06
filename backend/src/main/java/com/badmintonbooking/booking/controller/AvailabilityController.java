package com.badmintonbooking.booking.controller;

import com.badmintonbooking.booking.dto.CheckAvailabilityRequest;
import com.badmintonbooking.booking.dto.CheckAvailabilityResponse;
import com.badmintonbooking.booking.dto.CourtAvailabilityResponse;
import com.badmintonbooking.booking.service.AvailabilityService;
import com.badmintonbooking.common.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/courts")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @GetMapping("/{id}/availability")
    public ResponseEntity<ApiResponse<CourtAvailabilityResponse>> getCourtAvailability(
            @PathVariable("id") Long courtId,
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        CourtAvailabilityResponse response = availabilityService.getCourtAvailability(courtId, queryDate);
        return ResponseEntity.ok(ApiResponse.ok(response, "Tra cứu lịch sân thành công"));
    }

    @PostMapping("/check-availability")
    public ResponseEntity<ApiResponse<CheckAvailabilityResponse>> checkIntervalAvailability(
            @Valid @RequestBody CheckAvailabilityRequest request
    ) {
        CheckAvailabilityResponse response = availabilityService.checkIntervalAvailability(
                request.courtId(),
                request.date(),
                request.startTime(),
                request.endTime()
        );
        return ResponseEntity.ok(ApiResponse.ok(response, "Kiểm tra tính khả dụng thành công"));
    }
}
