package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class V9__import_alobooking_public_profiles extends BaseJavaMigration {

    private static final String CREATE_PROFILES = """
            CREATE TABLE IF NOT EXISTS alobooking_public_facility_profiles (
                facility_id BIGINT PRIMARY KEY REFERENCES facilities(id) ON DELETE CASCADE,
                alobooking_code VARCHAR(255) NOT NULL UNIQUE,
                published_court_count INTEGER CHECK (published_court_count > 0),
                public_contact TEXT,
                booking_url TEXT,
                booking_source_url TEXT,
                imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """;

    private static final String IMPORT_PROFILES = """
            WITH venues AS (
                SELECT code, phone, "courtCount"
                FROM jsonb_to_recordset(CAST(? AS jsonb)) AS data(code text, phone text, "courtCount" int)
            ),
            public_links AS (
                SELECT code, "bookingUrl", "sourceUrl"
                FROM jsonb_to_recordset(CAST(? AS jsonb)) AS data(code text, "bookingUrl" text, "sourceUrl" text)
            )
            INSERT INTO alobooking_public_facility_profiles (
                facility_id, alobooking_code, published_court_count, public_contact, booking_url, booking_source_url
            )
            SELECT f.id, v.code, CASE WHEN v."courtCount" > 0 THEN v."courtCount" END,
                NULLIF(trim(v.phone), ''), l."bookingUrl", l."sourceUrl"
            FROM venues v
            JOIN facilities f ON f.slug = 'alobooking-' || v.code
            LEFT JOIN public_links l ON l.code = v.code
            ON CONFLICT DO NOTHING
            """;

    @Override
    public void migrate(Context context) throws Exception {
        try (var statement = context.getConnection().createStatement()) {
            statement.executeUpdate(CREATE_PROFILES);
        }
        try (var statement = context.getConnection().prepareStatement(IMPORT_PROFILES)) {
            statement.setString(1, readResource("badminton_venues.json"));
            statement.setString(2, readResource("alobooking_public_sources.json"));
            statement.executeUpdate();
        }
    }

    private String readResource(String name) throws IOException {
        try (var resource = getClass().getResourceAsStream("/data/" + name)) {
            if (resource == null) {
                throw new IOException("Thiếu tệp data/" + name);
            }
            return new String(resource.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
