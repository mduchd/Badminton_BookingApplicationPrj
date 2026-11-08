package com.badmintonbooking.court.controller;

import com.badmintonbooking.common.ApiResponse;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.court.repository.PriceRuleRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/v1/public/facilities")
public class PublicFacilityController {
    private final FacilityRepository facilities;
    private final CourtRepository courts;
    private final PriceRuleRepository prices;
    public PublicFacilityController(FacilityRepository facilities, CourtRepository courts, PriceRuleRepository prices) {
        this.facilities = facilities; this.courts = courts; this.prices = prices;
    }
    public record FacilitySummary(Long id, String name, String address, String district,
                                  Double latitude, Double longitude, String openHours, Double minPricePerHour) {}
    @GetMapping
    public ApiResponse<List<FacilitySummary>> list() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        var result = facilities.findByStatus("ACTIVE").stream().map(f -> {
            var ids = courts.findByFacilityIdAndStatus(f.getId(), "ACTIVE").stream().map(c -> c.getId()).toList();
            Double min = ids.isEmpty() ? null : prices.findByCourtIdIn(ids).stream()
                .filter(p -> p.getPricePerSlot() != null && p.getSlotDurationMinutes() != null && p.getSlotDurationMinutes() > 0)
                .filter(p -> (p.getEffectiveFrom() == null || !p.getEffectiveFrom().isAfter(today)) && (p.getEffectiveTo() == null || !p.getEffectiveTo().isBefore(today)))
                .map(p -> p.getPricePerSlot().doubleValue() * 60 / p.getSlotDurationMinutes())
                .min(Double::compareTo).orElse(null);
            return new FacilitySummary(f.getId(), f.getName(), f.getAddress(), f.getDistrict(), f.getLatitude(), f.getLongitude(),
                f.getOpenTime() + " - " + f.getCloseTime(), min);
        }).toList();
        return ApiResponse.success(result, "Danh sách cụm sân");
    }
}
