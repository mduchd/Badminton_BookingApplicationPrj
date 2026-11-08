package com.badmintonbooking.court.service;

import com.badmintonbooking.common.exception.BadRequestException;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AddressNormalizerService {

    private static final Map<String, double[]> DISTRICT_COORDS = new LinkedHashMap<>();

    static {
        // Hà Nội
        DISTRICT_COORDS.put("cầu giấy", new double[]{21.0313, 105.7831});
        DISTRICT_COORDS.put("đống đa", new double[]{21.0180, 105.8290});
        DISTRICT_COORDS.put("ba đình", new double[]{21.0341, 105.8195});
        DISTRICT_COORDS.put("hoàn kiếm", new double[]{21.0285, 105.8542});
        DISTRICT_COORDS.put("hai bà trưng", new double[]{21.0058, 105.8576});
        DISTRICT_COORDS.put("thanh xuân", new double[]{20.9938, 105.8114});
        DISTRICT_COORDS.put("hoàng mai", new double[]{20.9740, 105.8544});
        DISTRICT_COORDS.put("hà đông", new double[]{20.9714, 105.7788});
        DISTRICT_COORDS.put("nam từ liêm", new double[]{21.0156, 105.7654});
        DISTRICT_COORDS.put("bắc từ liêm", new double[]{21.0667, 105.7725});
        DISTRICT_COORDS.put("tây hồ", new double[]{21.0688, 105.8226});
        DISTRICT_COORDS.put("long biên", new double[]{21.0450, 105.8870});
        // TP. Hồ Chí Minh
        DISTRICT_COORDS.put("quận 1", new double[]{10.7769, 106.7009});
        DISTRICT_COORDS.put("quận 3", new double[]{10.7843, 106.6844});
        DISTRICT_COORDS.put("quận 7", new double[]{10.7340, 106.7218});
        DISTRICT_COORDS.put("quận 10", new double[]{10.7715, 106.6710});
        DISTRICT_COORDS.put("bình thạnh", new double[]{10.8106, 106.7091});
        DISTRICT_COORDS.put("phú nhuận", new double[]{10.7995, 106.6805});
        DISTRICT_COORDS.put("tân bình", new double[]{10.8015, 106.6526});
        DISTRICT_COORDS.put("gò vấp", new double[]{10.8387, 106.6653});
        DISTRICT_COORDS.put("thủ đức", new double[]{10.8494, 106.7537});
    }

    public record NormalizedLocation(
            String city,
            String district,
            String ward,
            String streetAddress,
            String rawAddress,
            String normalizedAddress,
            double latitude,
            double longitude,
            String mapsEmbedUrl,
            String mapsDirectionsUrl
    ) {}

    public NormalizedLocation normalize(
            String cityInput,
            String districtInput,
            String wardInput,
            String streetInput,
            String rawAddressInput,
            Double latitudeInput,
            Double longitudeInput
    ) {
        String city = cleanSegment(cityInput);
        if (city.isEmpty()) {
            city = inferCityFromDistrict(districtInput);
        }
        String district = cleanSegment(districtInput);
        String ward = cleanSegment(wardInput);
        String street = cleanSegment(streetInput);
        String rawAddress = cleanSegment(rawAddressInput);

        if (street.isEmpty() && !rawAddress.isEmpty()) {
            String[] parts = rawAddress.split(",");
            if (parts.length > 0) {
                street = cleanSegment(parts[0]);
            }
        }

        List<String> segments = new ArrayList<>();
        if (!street.isEmpty()) {
            segments.add(street);
        }
        if (!ward.isEmpty() && !containsIgnoreCase(segments, ward)) {
            segments.add(formatWard(ward));
        }
        if (!district.isEmpty() && !containsIgnoreCase(segments, district)) {
            segments.add(formatDistrict(district));
        }
        if (!city.isEmpty() && !containsIgnoreCase(segments, city)) {
            segments.add(formatCity(city));
        }

        String normalizedAddress = segments.isEmpty() ? rawAddress : String.join(", ", segments);
        if (normalizedAddress.isEmpty()) {
            throw new BadRequestException("Địa chỉ cụm sân không được để trống.");
        }
        String displayAddress = !rawAddress.isEmpty() ? rawAddress : normalizedAddress;

        double[] coords = resolveCoordinates(latitudeInput, longitudeInput, district, city);
        double lat = Math.round(coords[0] * 1_000_000.0) / 1_000_000.0;
        double lng = Math.round(coords[1] * 1_000_000.0) / 1_000_000.0;

        String mapsEmbedUrl = buildMapsEmbedUrl(lat, lng, normalizedAddress);
        String mapsDirectionsUrl = buildMapsDirectionsUrl(lat, lng, normalizedAddress);

        return new NormalizedLocation(
                city.isEmpty() ? "Hà Nội" : city,
                district,
                ward,
                street,
                displayAddress,
                normalizedAddress,
                lat,
                lng,
                mapsEmbedUrl,
                mapsDirectionsUrl
        );
    }

    public String buildMapsEmbedUrl(Double lat, Double lng, String address) {
        if (lat != null && lng != null) {
            return String.format(Locale.US, "https://maps.google.com/maps?q=%.6f,%.6f&z=16&output=embed", lat, lng);
        }
        String query = URLEncoder.encode(address != null ? address : "Việt Nam", StandardCharsets.UTF_8);
        return "https://maps.google.com/maps?q=" + query + "&z=15&output=embed";
    }

    public String buildMapsDirectionsUrl(Double lat, Double lng, String address) {
        if (lat != null && lng != null) {
            return String.format(Locale.US, "https://www.google.com/maps/dir/?api=1&destination=%.6f,%.6f", lat, lng);
        }
        String query = URLEncoder.encode(address != null ? address : "Việt Nam", StandardCharsets.UTF_8);
        return "https://www.google.com/maps/search/?api=1&query=" + query;
    }

    public String toSlug(String input) {
        if (input == null || input.isBlank()) {
            return "cum-san-" + System.currentTimeMillis();
        }
        String withoutDiacritics = Normalizer.normalize(input.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        String slug = withoutDiacritics.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return slug.isEmpty() ? "cum-san-" + System.currentTimeMillis() : slug;
    }

    public Double calculateDistanceKm(Double lat1, Double lng1, Double lat2, Double lng2) {
        if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
            return null;
        }
        double earthRadiusKm = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(earthRadiusKm * c * 10.0) / 10.0;
    }

    private double[] resolveCoordinates(Double lat, Double lng, String district, String city) {
        if (lat != null && lng != null) {
            if (lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) {
                throw new BadRequestException("Tọa độ bản đồ không hợp lệ (Vĩ độ [-90..90], Kinh độ [-180..180]).");
            }
            return new double[]{lat, lng};
        }

        if (district != null && !district.isBlank()) {
            String key = district.toLowerCase(Locale.ROOT)
                    .replace("quận ", "")
                    .replace("huyện ", "")
                    .replace("tp. ", "")
                    .trim();
            for (Map.Entry<String, double[]> entry : DISTRICT_COORDS.entrySet()) {
                if (district.toLowerCase(Locale.ROOT).contains(entry.getKey()) || entry.getKey().contains(key)) {
                    return entry.getValue();
                }
            }
        }

        if (city != null && city.toLowerCase(Locale.ROOT).contains("hồ chí minh")) {
            return new double[]{10.7769, 106.7009};
        }
        return new double[]{21.0285, 105.8342};
    }

    private String inferCityFromDistrict(String district) {
        if (district == null) return "Hà Nội";
        String lower = district.toLowerCase(Locale.ROOT);
        if (lower.contains("quận ") || lower.contains("bình thạnh") || lower.contains("phú nhuận")
                || lower.contains("tân bình") || lower.contains("gò vấp") || lower.contains("thủ đức")) {
            return "TP. Hồ Chí Minh";
        }
        return "Hà Nội";
    }

    private String cleanSegment(String s) {
        if (s == null) return "";
        return s.trim().replaceAll("\\s+", " ").replaceAll("^,+|,+$", "").trim();
    }

    private boolean containsIgnoreCase(List<String> list, String candidate) {
        String lower = candidate.toLowerCase(Locale.ROOT);
        return list.stream().anyMatch(item -> item.toLowerCase(Locale.ROOT).contains(lower));
    }

    private String formatWard(String ward) {
        String lower = ward.toLowerCase(Locale.ROOT);
        if (lower.startsWith("phường") || lower.startsWith("xã") || lower.startsWith("thị trấn")) {
            return ward;
        }
        return "Phường " + ward;
    }

    private String formatDistrict(String district) {
        String lower = district.toLowerCase(Locale.ROOT);
        if (lower.startsWith("quận") || lower.startsWith("huyện") || lower.startsWith("tp") || lower.startsWith("thành phố")) {
            return district;
        }
        return "Quận " + district;
    }

    private String formatCity(String city) {
        String lower = city.toLowerCase(Locale.ROOT);
        if (lower.startsWith("tp") || lower.startsWith("thành phố") || lower.startsWith("tỉnh")) {
            return city;
        }
        if (lower.equals("hà nội") || lower.equals("hồ chí minh") || lower.equals("đà nẵng")) {
            return "TP. " + city;
        }
        return city;
    }
}
