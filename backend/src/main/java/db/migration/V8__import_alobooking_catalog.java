package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class V8__import_alobooking_catalog extends BaseJavaMigration {

    private static final String IMPORT_CATALOG = """
            WITH venues AS (
                SELECT venue
                FROM jsonb_array_elements(CAST(? AS jsonb)) AS source(venue)
            ),
            inserted AS (
                INSERT INTO facilities (
                    slug, name, sport_type, city, district, ward, street_address, address,
                    normalized_address, latitude, longitude, open_time, close_time,
                    min_price, max_price, phone, rating, review_count, image_url, logo_url,
                    description, status, is_approved
                )
                SELECT 'alobooking-' || (v->>'code'), v->>'name', v->>'sportType',
                    v->>'city', v->>'district', v->>'ward', v->>'streetAddress',
                    v->>'address', v->>'address', (v->>'latitude')::float8, (v->>'longitude')::float8,
                    (v->>'openTime')::time, (v->>'closeTime')::time,
                    (v->>'minPrice')::numeric, (v->>'maxPrice')::numeric,
                    NULLIF(CASE WHEN length(v->>'phone') > 30
                        THEN trim(split_part(split_part(v->>'phone', '|', 1), ' - ', 1))
                        ELSE v->>'phone' END, ''),
                    CASE WHEN (v->>'reviewCount')::int > 0 THEN (v->>'rating')::numeric ELSE 0 END,
                    (v->>'reviewCount')::int, v->>'imageUrl', v->>'logoUrl', v->>'description',
                    'ACTIVE', true
                FROM venues AS source(v)
                WHERE NOT EXISTS (
                    SELECT 1 FROM facilities f
                    WHERE lower(f.name) = lower(v->>'name')
                      AND lower(f.address) = lower(v->>'address')
                )
                ON CONFLICT DO NOTHING
                RETURNING id, slug
            ),
            inserted_amenities AS (
                INSERT INTO facility_amenities (facility_id, amenity)
                SELECT i.id, amenity.value
                FROM inserted i
                JOIN venues AS source(v) ON i.slug = 'alobooking-' || (v->>'code')
                CROSS JOIN LATERAL jsonb_array_elements_text(v->'amenities') AS amenity(value)
                ON CONFLICT DO NOTHING
            )
            INSERT INTO facility_images (facility_id, image_url, sort_order)
            SELECT i.id, image.value, image.position
            FROM inserted i
            JOIN venues AS source(v) ON i.slug = 'alobooking-' || (v->>'code')
            CROSS JOIN LATERAL jsonb_array_elements_text(v->'galleryImages')
                WITH ORDINALITY AS image(value, position)
            """;

    @Override
    public void migrate(Context context) throws Exception {
        try (var source = getClass().getResourceAsStream("/data/badminton_venues.json")) {
            if (source == null) {
                throw new IOException("Thiếu tệp data/badminton_venues.json");
            }
            try (var statement = context.getConnection().prepareStatement(IMPORT_CATALOG)) {
                statement.setString(1, new String(source.readAllBytes(), StandardCharsets.UTF_8));
                statement.executeUpdate();
            }
        }
    }
}
