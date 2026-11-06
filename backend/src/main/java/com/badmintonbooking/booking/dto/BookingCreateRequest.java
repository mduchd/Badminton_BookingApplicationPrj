package com.badmintonbooking.booking.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public record BookingCreateRequest(
    @NotNull(message = "courtId không được để trống")
    Long courtId,

    @NotNull(message = "bookingDate không được để trống")
    @FutureOrPresent(message = "Ngày đặt sân không được ở quá khứ")
    LocalDate bookingDate,

    @NotNull(message = "startTime không được để trống")
    LocalTime startTime,

    @NotNull(message = "endTime không được để trống")
    LocalTime endTime,

    String note,

    Long customerId // Nếu chưa tích hợp JWT context thì truyền hoặc fallback id mặc định 1
) {}
