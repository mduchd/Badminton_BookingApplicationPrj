package com.badmintonbooking.court.service;

import com.badmintonbooking.booking.entity.CourtOccupancy;
import com.badmintonbooking.booking.enums.ActiveStatus;
import com.badmintonbooking.booking.enums.OccupancyType;
import com.badmintonbooking.booking.repository.CourtOccupancyRepository;
import com.badmintonbooking.booking.service.AvailabilityService;
import com.badmintonbooking.common.exception.ResourceNotFoundException;
import com.badmintonbooking.court.dto.*;
import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.entity.FacilityImage;
import com.badmintonbooking.court.entity.PriceRule;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityImageRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.court.repository.PriceRuleRepository;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class FacilityQueryService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final FacilityRepository facilityRepository;
    private final CourtRepository courtRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final FacilityImageRepository facilityImageRepository;
    private final CourtOccupancyRepository occupancyRepository;
    private final AddressNormalizerService addressNormalizerService;

    public FacilityQueryService(
            FacilityRepository facilityRepository,
            CourtRepository courtRepository,
            PriceRuleRepository priceRuleRepository,
            FacilityImageRepository facilityImageRepository,
            CourtOccupancyRepository occupancyRepository,
            AddressNormalizerService addressNormalizerService
    ) {
        this.facilityRepository = facilityRepository;
        this.courtRepository = courtRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.facilityImageRepository = facilityImageRepository;
        this.occupancyRepository = occupancyRepository;
        this.addressNormalizerService = addressNormalizerService;
    }

    public List<FacilitySummaryDto> searchFacilities(
            String keyword,
            String city,
            String district,
            String ward,
            String sportType,
            List<String> amenities,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Double lat,
            Double lng,
            Double radiusKm,
            String sortBy
    ) {
        String kw = safeFilter(keyword);
        String ct = safeFilter(city);
        String dist = safeFilter(district);
        String wd = safeFilter(ward);
        String sp = safeFilter(sportType);
        if ("all".equalsIgnoreCase(sp)) {
            sp = "";
        }

        List<Facility> matched = facilityRepository.filterActiveFacilitiesSql(
                kw, ct, dist, wd, sp, minPrice, maxPrice
        );

        // SQL filter theo danh sách tiện ích bắt buộc
        if (amenities != null && !amenities.isEmpty()) {
            Set<String> normalizedAmenities = amenities.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(s -> s.toLowerCase(Locale.ROOT))
                    .collect(Collectors.toSet());

            if (!normalizedAmenities.isEmpty()) {
                Set<Long> matchedByAmenities = new HashSet<>(
                        facilityRepository.findFacilityIdsHavingAllAmenities(normalizedAmenities, normalizedAmenities.size())
                );
                matched = matched.stream()
                        .filter(f -> matchedByAmenities.contains(f.getId()))
                        .toList();
            }
        }

        List<FacilitySummaryDto> dtos = toFacilitySummaries(matched, lat, lng);

        // Lọc theo bán kính GPS nếu có yêu cầu
        if (lat != null && lng != null && radiusKm != null && radiusKm > 0) {
            dtos = dtos.stream()
                    .filter(d -> d.distanceKm() != null && d.distanceKm() <= radiusKm)
                    .toList();
        }

        // Sắp xếp kết quả
        String sort = sortBy != null ? sortBy.trim().toLowerCase(Locale.ROOT) : "rating_desc";
        Comparator<FacilitySummaryDto> comparator = switch (sort) {
            case "price_asc" -> Comparator.comparing(
                    d -> d.pricePerHour() != null ? d.pricePerHour() : BigDecimal.ZERO
            );
            case "price_desc" -> Comparator.comparing(
                    (FacilitySummaryDto d) -> d.pricePerHour() != null ? d.pricePerHour() : BigDecimal.ZERO
            ).reversed();
            case "distance_asc" -> Comparator.comparing(
                    d -> d.distanceKm() != null ? d.distanceKm() : Double.MAX_VALUE
            );
            default -> Comparator.comparing(
                    (FacilitySummaryDto d) -> d.rating() != null ? d.rating() : BigDecimal.ZERO
            ).reversed();
        };

        return dtos.stream().sorted(comparator).toList();
    }

    public Page<FacilitySummaryDto> searchFacilitiesPage(String keyword, String district, BigDecimal maxPrice,
            List<String> amenities, BigDecimal minRating, List<Long> ids, int page, int size) {
        Specification<Facility> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> conditions = new ArrayList<>();
            conditions.add(cb.equal(root.get("status"), "ACTIVE"));
            conditions.add(cb.isTrue(root.get("isApproved")));
            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                conditions.add(cb.or(cb.like(cb.lower(root.get("name")), pattern), cb.like(cb.lower(root.get("address")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("normalizedAddress"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("district"), "")), pattern)));
            }
            if (district != null && !district.isBlank())
                conditions.add(cb.like(cb.lower(cb.coalesce(root.<String>get("district"), "")), "%" + district.trim().toLowerCase(Locale.ROOT) + "%"));
            if (maxPrice != null) conditions.add(cb.lessThanOrEqualTo(root.get("minPrice"), maxPrice));
            if (minRating != null) conditions.add(cb.greaterThanOrEqualTo(root.get("rating"), minRating));
            if (ids != null) conditions.add(ids.isEmpty() ? cb.disjunction() : root.get("id").in(ids));
            if (amenities != null) for (String amenity : amenities) {
                if (amenity == null || amenity.isBlank()) continue;
                var sub = query.subquery(Long.class);
                var facility = sub.from(Facility.class);
                jakarta.persistence.criteria.SetJoin<Facility, String> item = facility.joinSet("amenitySet");
                sub.select(facility.get("id")).where(cb.equal(facility.get("id"), root.get("id")),
                        cb.equal(cb.lower(item), amenity.trim().toLowerCase(Locale.ROOT)));
                conditions.add(cb.exists(sub));
            }
            return cb.and(conditions.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        Page<Facility> result = facilityRepository.findAll(spec, PageRequest.of(Math.max(0, page), Math.clamp(size, 1, 100),
                Sort.by(Sort.Order.desc("rating"), Sort.Order.asc("id"))));
        return new PageImpl<>(toFacilitySummaries(result.getContent(), null, null), result.getPageable(), result.getTotalElements());
    }

    public FacilityDetailDto getFacilityDetail(Long facilityId, Double userLat, Double userLng) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cụm sân với id: " + facilityId));

        List<Court> courts = courtRepository.findByFacilityIdOrderByCourtNumberAscIdAsc(facilityId);
        List<FacilityImage> images = facilityImageRepository.findByFacilityIdOrderBySortOrderAscIdAsc(facilityId);
        List<PriceRule> rules = priceRuleRepository.findAllByFacility(facilityId);

        Map<Long, String> courtNameById = courts.stream()
                .collect(Collectors.toMap(Court::getId, Court::getName, (a, b) -> a));

        List<CourtDto> courtDtos = courts.stream().map(this::toCourtDto).toList();
        List<PriceRuleDto> ruleDtos = rules.stream()
                .map(r -> toPriceRuleDto(r, courtNameById))
                .toList();

        List<Long> courtIds = courts.stream().map(Court::getId).toList();
        List<MaintenanceBlockDto> blocks = courtIds.isEmpty()
                ? List.of()
                : occupancyRepository.findByCourtIdInAndOccupancyTypeAndActiveStatus(
                        courtIds, OccupancyType.MAINTENANCE, ActiveStatus.ACTIVE
                  ).stream()
                  .map(o -> toMaintenanceDto(o, facility, courtNameById))
                  .toList();

        FacilitySummaryDto summary = toFacilitySummary(facility, courtDtos, images, userLat, userLng);
        return new FacilityDetailDto(summary, courtDtos, ruleDtos, blocks);
    }

    public List<CourtDto> getFacilityCourts(Long facilityId) {
        if (!facilityRepository.existsById(facilityId)) {
            throw new ResourceNotFoundException("Không tìm thấy cụm sân với id: " + facilityId);
        }
        return courtRepository.findByFacilityIdOrderByCourtNumberAscIdAsc(facilityId)
                .stream()
                .map(this::toCourtDto)
                .toList();
    }

    public List<PriceRuleDto> getFacilityPriceRules(Long facilityId) {
        if (!facilityRepository.existsById(facilityId)) {
            throw new ResourceNotFoundException("Không tìm thấy cụm sân với id: " + facilityId);
        }
        Map<Long, String> courtNameById = courtRepository.findByFacilityIdOrderByCourtNumberAscIdAsc(facilityId)
                .stream()
                .collect(Collectors.toMap(Court::getId, Court::getName, (a, b) -> a));

        return priceRuleRepository.findAllByFacility(facilityId)
                .stream()
                .map(r -> toPriceRuleDto(r, courtNameById))
                .toList();
    }

    public FacilityFilterMetadataDto getFilterMetadata() {
        return new FacilityFilterMetadataDto(
                facilityRepository.findDistinctActiveCities(),
                facilityRepository.findDistinctActiveDistricts(),
                facilityRepository.findDistinctAmenities()
        );
    }

    public List<FacilitySummaryDto> toFacilitySummaries(List<Facility> facilities, Double userLat, Double userLng) {
        if (facilities.isEmpty()) {
            return List.of();
        }
        List<Long> ids = facilities.stream().map(Facility::getId).toList();
        Map<Long, List<CourtDto>> courtsByFacility = courtRepository.findByFacilityIdInOrderByCourtNumberAscIdAsc(ids)
                .stream()
                .collect(Collectors.groupingBy(
                        Court::getFacilityId,
                        Collectors.mapping(this::toCourtDto, Collectors.toList())
                ));

        Map<Long, List<FacilityImage>> imagesByFacility = facilityImageRepository.findByFacilityIdInOrderBySortOrderAscIdAsc(ids)
                .stream()
                .collect(Collectors.groupingBy(FacilityImage::getFacilityId));

        return facilities.stream()
                .map(f -> toFacilitySummary(
                        f,
                        courtsByFacility.getOrDefault(f.getId(), List.of()),
                        imagesByFacility.getOrDefault(f.getId(), List.of()),
                        userLat,
                        userLng
                ))
                .toList();
    }

    public FacilitySummaryDto toFacilitySummary(
            Facility f,
            List<CourtDto> courts,
            List<FacilityImage> images,
            Double userLat,
            Double userLng
    ) {
        List<String> gallery = new ArrayList<>();
        if (f.getImageUrl() != null && !f.getImageUrl().isBlank()) {
            gallery.add(f.getImageUrl());
        }
        for (FacilityImage img : images) {
            if (img.getImageUrl() != null && !gallery.contains(img.getImageUrl())) {
                gallery.add(img.getImageUrl());
            }
        }
        Double distanceKm = addressNormalizerService.calculateDistanceKm(userLat, userLng, f.getLatitude(), f.getLongitude());

        String embedUrl = f.getMapsEmbedUrl() != null && !f.getMapsEmbedUrl().isBlank()
                ? f.getMapsEmbedUrl()
                : addressNormalizerService.buildMapsEmbedUrl(f.getLatitude(), f.getLongitude(), f.getNormalizedAddress());
        String directionsUrl = addressNormalizerService.buildMapsDirectionsUrl(f.getLatitude(), f.getLongitude(), f.getNormalizedAddress());

        String closeTimeStr = (f.getCloseTime().getHour() == 23 && f.getCloseTime().getMinute() == 59)
                ? "24:00"
                : f.getCloseTime().format(TIME_FMT);
        String openHours = f.getOpenTime().format(TIME_FMT) + " - " + closeTimeStr;
        BigDecimal repPrice = f.getMinPrice() != null ? f.getMinPrice() : BigDecimal.valueOf(100000);

        return new FacilitySummaryDto(
                f.getId(),
                f.getOwnerId(),
                f.getName(),
                f.getSlug(),
                f.getCity(),
                f.getDistrict(),
                f.getWard(),
                f.getStreetAddress(),
                f.getAddress(),
                f.getNormalizedAddress(),
                f.getLatitude(),
                f.getLongitude(),
                distanceKm,
                f.getOpenTime(),
                f.getCloseTime(),
                openHours,
                f.getPhone(),
                f.getMessengerUrl(),
                f.getDescription(),
                f.getLogoUrl(),
                gallery.isEmpty() ? null : gallery.getFirst(),
                gallery,
                embedUrl,
                directionsUrl,
                f.getSportType(),
                f.getRating(),
                f.getReviewCount(),
                f.getMinPrice(),
                f.getMaxPrice(),
                repPrice,
                f.getStatus(),
                f.getIsApproved(),
                f.getAmenities(),
                courts
        );
    }

    public CourtDto toCourtDto(Court c) {
        return new CourtDto(
                c.getId(),
                c.getFacilityId(),
                c.getName(),
                c.getCourtNumber(),
                c.getCourtType(),
                c.getPricePerHour(),
                c.getSurfaceType(),
                c.getDescription(),
                c.getStatus()
        );
    }

    public PriceRuleDto toPriceRuleDto(PriceRule r, Map<Long, String> courtNameById) {
        int slotMins = r.getSlotDurationMinutes() != null && r.getSlotDurationMinutes() > 0
                ? r.getSlotDurationMinutes() : 60;
        BigDecimal hourly = r.getPricePerSlot()
                .multiply(BigDecimal.valueOf(60))
                .divide(BigDecimal.valueOf(slotMins), 2, RoundingMode.HALF_UP);
        String courtName = r.getCourtId() != null
                ? courtNameById.getOrDefault(r.getCourtId(), "Sân #" + r.getCourtId())
                : "Tất cả sân con";

        return new PriceRuleDto(
                r.getId(),
                r.getFacilityId(),
                r.getCourtId(),
                courtName,
                r.getName(),
                r.getDayOfWeek(),
                r.getDayType(),
                r.getCustomerType(),
                r.getStartTime(),
                r.getEndTime(),
                r.getPricePerSlot(),
                hourly,
                slotMins,
                r.getEffectiveFrom(),
                r.getEffectiveTo()
        );
    }

    public MaintenanceBlockDto toMaintenanceDto(CourtOccupancy o, Facility f, Map<Long, String> courtNameById) {
        var zonedStart = o.getStartAt().atZoneSameInstant(AvailabilityService.ZONE_VN);
        var zonedEnd = o.getEndAt().atZoneSameInstant(AvailabilityService.ZONE_VN);
        return new MaintenanceBlockDto(
                o.getId(),
                f.getId(),
                f.getName(),
                o.getCourtId(),
                courtNameById.getOrDefault(o.getCourtId(), "Sân #" + o.getCourtId()),
                zonedStart.toLocalDate(),
                zonedStart.toLocalTime(),
                zonedEnd.toLocalTime(),
                o.getNote() != null ? o.getNote() : "Bảo dưỡng định kỳ",
                o.getActiveStatus().name(),
                o.getCreatedAt()
        );
    }

    private String safeFilter(String value) {
        return value != null ? value.trim() : "";
    }
}
