-- Lịch quan sát từ AloBooking được lưu riêng với đơn đặt sân của SmashCourt.
-- Thiếu bản ghi nghĩa là chưa có dữ liệu cho khung giờ đó.
CREATE TABLE alobooking_schedule_slots (
    facility_id BIGINT NOT NULL REFERENCES alobooking_public_facility_profiles(facility_id) ON DELETE CASCADE,
    external_court_code TEXT NOT NULL CHECK (btrim(external_court_code) <> ''),
    court_name TEXT NOT NULL CHECK (btrim(court_name) <> ''),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED', 'MAINTENANCE')),
    observed_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (facility_id, external_court_code, starts_at),
    CHECK (ends_at > starts_at)
);

CREATE INDEX idx_alobooking_schedule_slots_facility_time
    ON alobooking_schedule_slots (facility_id, starts_at);
