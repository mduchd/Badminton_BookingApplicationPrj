package com.badmintonbooking.config;

import com.badmintonbooking.court.entity.Court;
import com.badmintonbooking.court.entity.Facility;
import com.badmintonbooking.court.entity.FacilityImage;
import com.badmintonbooking.court.entity.PriceRule;
import com.badmintonbooking.court.repository.CourtRepository;
import com.badmintonbooking.court.repository.FacilityImageRepository;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.court.repository.PriceRuleRepository;
import com.badmintonbooking.court.service.AddressNormalizerService;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Component
@Profile("h2 & demo")
public class H2DemoDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(H2DemoDataInitializer.class);

    private final UserRepository userRepository;
    private final FacilityRepository facilityRepository;
    private final CourtRepository courtRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final FacilityImageRepository facilityImageRepository;
    private final AddressNormalizerService addressNormalizerService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    public H2DemoDataInitializer(
            UserRepository userRepository,
            FacilityRepository facilityRepository,
            CourtRepository courtRepository,
            PriceRuleRepository priceRuleRepository,
            FacilityImageRepository facilityImageRepository,
            AddressNormalizerService addressNormalizerService,
            PasswordEncoder passwordEncoder,
            ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.facilityRepository = facilityRepository;
        this.courtRepository = courtRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.facilityImageRepository = facilityImageRepository;
        this.addressNormalizerService = addressNormalizerService;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (facilityRepository.count() > 0) {
            return;
        }

        User owner = createDemoUser("owner@smashcourt.vn", "Nguyễn Minh Quân (Chủ sân)", "0912345678", "COURT_OWNER");
        createDemoUser("minhtri.dev@gmail.com", "Nguyễn Minh Trí", "0988123456", "CUSTOMER");
        createDemoUser("customer@smashcourt.vn", "Trần Hoàng Nam", "0987654321", "CUSTOMER");
        createDemoUser("admin@smashcourt.vn", "Quản trị viên SmashCourt", "0909000111", "SYSTEM_ADMIN");

        ClassPathResource resource = new ClassPathResource("data/badminton_venues.json");
        try (InputStream is = resource.getInputStream()) {
            List<Map<String, Object>> rawVenues = objectMapper.readValue(
                    is,
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            int seededCount = 0;
            for (Map<String, Object> item : rawVenues) {
                String sportType = asString(item.get("sportType"), "badminton");
                if (!"badminton".equalsIgnoreCase(sportType)) {
                    continue;
                }

                String name = asString(item.get("name"), "Cụm sân Cầu lông SmashCourt");
                String code = asString(item.get("code"), null);
                String city = asString(item.get("city"), "Hà Nội");
                String district = asString(item.get("district"), "Cầu Giấy");
                String ward = asString(item.get("ward"), "");
                String streetAddress = asString(item.get("streetAddress"), "");
                String rawAddress = asString(item.get("address"), null);
                double lat = asDouble(item.get("latitude"), 21.0285);
                double lng = asDouble(item.get("longitude"), 105.8542);
                LocalTime openTime = parseSafeTime(asString(item.get("openTime"), "05:00"), LocalTime.of(5, 0));
                LocalTime closeTime = parseSafeTime(asString(item.get("closeTime"), "23:00"), LocalTime.of(23, 0));
                int courtCount = Math.max(1, asInt(item.get("courtCount"), 6));
                BigDecimal minPrice = BigDecimal.valueOf(asLong(item.get("minPrice"), 90000L));
                BigDecimal maxPrice = BigDecimal.valueOf(asLong(item.get("maxPrice"), 130000L));
                String phone = asString(item.get("phone"), "0912345678");
                BigDecimal rating = BigDecimal.valueOf(asDouble(item.get("rating"), 4.8));
                int reviewCount = asInt(item.get("reviewCount"), 0);
                String imageUrl = asString(
                        item.get("imageUrl"),
                        "/images/venues/hn-bmc-1.jpg"
                );
                String logoUrl = asString(item.get("logoUrl"), "/images/logos/badminton-club-logo.svg");
                String description = asString(item.get("description"), "");
                List<String> amenities = asStringList(item.get("amenities"));
                List<String> galleryImages = asRawStringList(item.get("galleryImages"));

                seedFacility(
                        owner.getId(),
                        code,
                        name,
                        city,
                        district,
                        ward,
                        streetAddress,
                        rawAddress,
                        lat,
                        lng,
                        openTime,
                        closeTime,
                        phone,
                        description,
                        logoUrl,
                        imageUrl,
                        galleryImages,
                        rating,
                        reviewCount,
                        amenities,
                        courtCount,
                        minPrice,
                        maxPrice,
                        seededCount + 1
                );
                seededCount++;
            }
            log.info("Đã nạp thành công {} cụm sân cầu lông vào cơ sở dữ liệu H2.", seededCount);
        } catch (Exception ex) {
            log.error("Không thể đọc data/badminton_venues.json để khởi tạo dữ liệu mẫu", ex);
        }
    }

    private User createDemoUser(String email, String fullName, String phone, String role) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User();
            u.setEmail(email);
            u.setPasswordHash(passwordEncoder.encode("123456"));
            u.setFullName(fullName);
            u.setPhone(phone);
            u.setRole(role);
            u.setProvider("LOCAL");
            u.setStatus("ACTIVE");
            return userRepository.save(u);
        });
    }

    private void seedFacility(
            Long ownerId,
            String code,
            String name,
            String city,
            String district,
            String ward,
            String streetAddress,
            String rawAddress,
            double lat,
            double lng,
            LocalTime openTime,
            LocalTime closeTime,
            String phone,
            String description,
            String logoUrl,
            String imageUrl,
            List<String> galleryImages,
            BigDecimal rating,
            int reviewCount,
            List<String> amenities,
            int courtCount,
            BigDecimal offPeakPrice,
            BigDecimal peakPrice,
            int index
    ) {
        var norm = addressNormalizerService.normalize(city, district, ward, streetAddress, rawAddress, lat, lng);

        Facility f = new Facility();
        f.setOwnerId(ownerId);
        f.setName(name);
        String baseSlug = (code != null && !code.isBlank())
                ? code.replace('_', '-') + "-" + index
                : addressNormalizerService.toSlug(name) + "-" + index;
        f.setSlug(baseSlug);
        f.setCity(norm.city());
        f.setDistrict(norm.district());
        f.setWard(norm.ward());
        f.setStreetAddress(norm.streetAddress());
        f.setAddress(rawAddress != null && !rawAddress.isBlank() ? rawAddress.trim() : norm.rawAddress());
        f.setNormalizedAddress(norm.normalizedAddress());
        f.setLatitude(norm.latitude());
        f.setLongitude(norm.longitude());
        f.setMapsEmbedUrl(norm.mapsEmbedUrl());
        f.setOpenTime(openTime);
        f.setCloseTime(closeTime);
        f.setPhone(phone);
        f.setDescription(description);
        f.setLogoUrl(logoUrl);
        f.setImageUrl(imageUrl);
        f.setSportType("badminton");
        f.setRating(rating);
        f.setReviewCount(reviewCount);
        f.setMinPrice(offPeakPrice);
        f.setMaxPrice(peakPrice);
        f.setStatus("ACTIVE");
        f.setIsApproved(true);
        f.setAmenitySet(new LinkedHashSet<>(amenities));
        Facility savedFacility = facilityRepository.save(f);

        LinkedHashSet<String> imagesToSave = new LinkedHashSet<>();
        imagesToSave.add(imageUrl);
        if (galleryImages != null) {
            imagesToSave.addAll(galleryImages);
        }
        int sortIdx = 0;
        for (String img : imagesToSave) {
            if (img != null && !img.isBlank()) {
                facilityImageRepository.save(new FacilityImage(savedFacility.getId(), img, null, sortIdx++));
            }
        }

        int courtsToCreate = Math.min(courtCount, 6);
        for (int i = 1; i <= courtsToCreate; i++) {
            Court court = new Court();
            court.setFacilityId(savedFacility.getId());
            court.setName("Sân " + i);
            court.setCourtNumber(i);
            court.setCourtType(i == 1 ? "VIP" : "STANDARD");
            court.setBasePricePerHour(offPeakPrice);
            court.setSurfaceType("Thảm PVC tiêu chuẩn BWF");
            court.setStatus("ACTIVE");
            Court savedCourt = courtRepository.save(court);

            PriceRule r1 = new PriceRule();
            r1.setFacilityId(savedFacility.getId());
            r1.setCourtId(savedCourt.getId());
            r1.setName("Khung giờ thấp điểm");
            r1.setDayOfWeek(0);
            r1.setDayType("ALL");
            r1.setCustomerType("CASUAL");
            r1.setStartTime(LocalTime.of(5, 0));
            r1.setEndTime(LocalTime.of(17, 0));
            r1.setPricePerSlot(offPeakPrice);
            r1.setSlotDurationMinutes(60);
            priceRuleRepository.save(r1);

            PriceRule r2 = new PriceRule();
            r2.setFacilityId(savedFacility.getId());
            r2.setCourtId(savedCourt.getId());
            r2.setName("Khung giờ cao điểm tối");
            r2.setDayOfWeek(0);
            r2.setDayType("ALL");
            r2.setCustomerType("CASUAL");
            r2.setStartTime(LocalTime.of(17, 0));
            r2.setEndTime(LocalTime.of(23, 59));
            r2.setPricePerSlot(peakPrice);
            r2.setSlotDurationMinutes(60);
            priceRuleRepository.save(r2);
        }
    }

    private static String asString(Object val, String fallback) {
        if (val == null) {
            return fallback;
        }
        String s = String.valueOf(val).trim();
        return s.isEmpty() ? fallback : s;
    }

    private static double asDouble(Object val, double fallback) {
        if (val instanceof Number n) {
            return n.doubleValue();
        }
        if (val != null) {
            try {
                return Double.parseDouble(String.valueOf(val).trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return fallback;
    }

    private static int asInt(Object val, int fallback) {
        if (val instanceof Number n) {
            return n.intValue();
        }
        if (val != null) {
            try {
                return Integer.parseInt(String.valueOf(val).trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return fallback;
    }

    private static long asLong(Object val, long fallback) {
        if (val instanceof Number n) {
            return n.longValue();
        }
        if (val != null) {
            try {
                return Long.parseLong(String.valueOf(val).trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return fallback;
    }

    private static List<String> asStringList(Object val) {
        List<String> out = new ArrayList<>();
        if (val instanceof List<?> rawList) {
            for (Object item : rawList) {
                if (item != null) {
                    String s = String.valueOf(item).trim();
                    if (!s.isEmpty()) {
                        out.add(s);
                    }
                }
            }
        }
        if (out.isEmpty()) {
            out.add("Thảm BWF tiêu chuẩn");
            out.add("Đèn LED chống chói");
            out.add("Bãi đỗ xe");
        }
        return out;
    }

    private static List<String> asRawStringList(Object val) {
        List<String> out = new ArrayList<>();
        if (val instanceof List<?> rawList) {
            for (Object item : rawList) {
                if (item != null) {
                    String s = String.valueOf(item).trim();
                    if (!s.isEmpty()) {
                        out.add(s);
                    }
                }
            }
        }
        return out;
    }

    private static LocalTime parseSafeTime(String raw, LocalTime fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        String normalized = raw.trim();
        if ("24:00".equals(normalized) || "24:00:00".equals(normalized)) {
            return LocalTime.of(23, 59);
        }
        try {
            return LocalTime.parse(normalized);
        } catch (Exception ignored) {
            return fallback;
        }
    }
}
