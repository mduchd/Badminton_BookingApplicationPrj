-- Flyway Migration: V2__init_facilities_and_courts.sql
-- Description: Khởi tạo bảng cơ sở sân (facilities) và sân con (courts)

CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(500) NOT NULL,
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'TP. Hồ Chí Minh',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    open_time TIME NOT NULL DEFAULT '05:30:00',
    close_time TIME NOT NULL DEFAULT '23:00:00',
    image_url TEXT,
    amenities TEXT[] DEFAULT ARRAY['Wifi miễn phí', 'Bãi đỗ xe', 'Căn tin / Nước giải khát'],
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0,
    review_count INT NOT NULL DEFAULT 0,
    sport_type VARCHAR(50) NOT NULL DEFAULT 'badminton',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_facility_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE'))
);

CREATE INDEX IF NOT EXISTS idx_facilities_owner ON facilities(owner_id);
CREATE INDEX IF NOT EXISTS idx_facilities_district ON facilities(district);
CREATE INDEX IF NOT EXISTS idx_facilities_sport_type ON facilities(sport_type);
CREATE INDEX IF NOT EXISTS idx_facilities_status ON facilities(status);

DROP TRIGGER IF EXISTS trg_facilities_updated_at ON facilities;
CREATE TRIGGER trg_facilities_updated_at
BEFORE UPDATE ON facilities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    court_number INT NOT NULL,
    price_per_hour NUMERIC(12, 2) NOT NULL DEFAULT 100000,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_court_status CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE')),
    CONSTRAINT uq_facility_court_number UNIQUE (facility_id, court_number)
);

CREATE INDEX IF NOT EXISTS idx_courts_facility ON courts(facility_id);
CREATE INDEX IF NOT EXISTS idx_courts_status ON courts(status);

DROP TRIGGER IF EXISTS trg_courts_updated_at ON courts;
CREATE TRIGGER trg_courts_updated_at
BEFORE UPDATE ON courts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Seed dữ liệu sân mẫu liên kết với chủ sân (b0000000-0000-0000-0000-000000000002)
INSERT INTO facilities (id, owner_id, name, slug, address, district, city, latitude, longitude, open_time, close_time, image_url, amenities, rating, review_count, sport_type)
VALUES
    (
        'f0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        'Sân Cầu Lông Kỳ Hòa Q10',
        'san-cau-long-ky-hoa-q10',
        '238 Ba Tháng Hai, Phường 12, Quận 10',
        'Quận 10',
        'TP. Hồ Chí Minh',
        10.7715,
        106.6710,
        '05:30:00',
        '23:00:00',
        'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80',
        ARRAY['Thảm tiêu chuẩn BWF', 'Máy lạnh / Quạt công nghiệp', 'Bãi đỗ ô tô', 'Cho thuê vợt', 'Wifi miễn phí'],
        4.9,
        128,
        'badminton'
    ),
    (
        'f0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000002',
        'Sân Cầu Lông Đào Duy Anh',
        'san-cau-long-dao-duy-anh',
        '21 Đào Duy Anh, Phường 9, Quận Phú Nhuận',
        'Phú Nhuận',
        'TP. Hồ Chí Minh',
        10.7995,
        106.6805,
        '06:00:00',
        '22:30:00',
        'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&auto=format&fit=crop&q=80',
        ARRAY['Thảm Yonex', 'Phòng tắm nóng lạnh', 'Bãi giữ xe rộng', 'Nước uống miễn phí'],
        4.8,
        96,
        'badminton'
    ),
    (
        'f0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000002',
        'Sân Cầu Lông Thảo Điền',
        'san-cau-long-thao-dien',
        'Số 28 Thảo Điền, Phường Thảo Điền, TP. Thủ Đức',
        'Thủ Đức',
        'TP. Hồ Chí Minh',
        10.8035,
        106.7320,
        '05:00:00',
        '23:00:00',
        'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
        ARRAY['Hệ thống đèn LED chống chói', 'Khu vực cafe & nghỉ ngơi', 'HLV chuyên nghiệp'],
        4.95,
        210,
        'badminton'
    )
ON CONFLICT (slug) DO NOTHING;

-- Seed các sân con cho Kỳ Hòa Q10 (4 sân)
INSERT INTO courts (facility_id, name, court_number, price_per_hour, status)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'Sân 01 (VIP Thảm Yonex)', 1, 120000, 'AVAILABLE'),
    ('f0000000-0000-0000-0000-000000000001', 'Sân 02 (Tiêu chuẩn)', 2, 110000, 'AVAILABLE'),
    ('f0000000-0000-0000-0000-000000000001', 'Sân 03 (Tiêu chuẩn)', 3, 110000, 'AVAILABLE'),
    ('f0000000-0000-0000-0000-000000000001', 'Sân 04 (Tiêu chuẩn)', 4, 110000, 'AVAILABLE')
ON CONFLICT (facility_id, court_number) DO NOTHING;

-- Seed các sân con cho Đào Duy Anh (3 sân)
INSERT INTO courts (facility_id, name, court_number, price_per_hour, status)
VALUES
    ('f0000000-0000-0000-0000-000000000002', 'Sân A1', 1, 90000, 'AVAILABLE'),
    ('f0000000-0000-0000-0000-000000000002', 'Sân A2', 2, 90000, 'AVAILABLE'),
    ('f0000000-0000-0000-0000-000000000002', 'Sân A3', 3, 90000, 'AVAILABLE')
ON CONFLICT (facility_id, court_number) DO NOTHING;
