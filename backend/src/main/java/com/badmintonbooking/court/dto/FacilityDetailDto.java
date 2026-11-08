package com.badmintonbooking.court.dto;

import java.util.List;

public record FacilityDetailDto(
        FacilitySummaryDto facility,
        List<CourtDto> courts,
        List<PriceRuleDto> priceRules,
        List<MaintenanceBlockDto> activeMaintenanceBlocks
) {}
