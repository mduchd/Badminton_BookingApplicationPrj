-- Flyway Migration: V6__enhance_tv2_court_management.sql
-- Description: Nâng cấp lược đồ cơ sở dữ liệu cho TV2 (Quản lý Cụm sân, Sân con, Bảng giá, Địa chỉ chuẩn hóa, Bản đồ, Tiện ích, Ảnh Cloudinary, Bảo trì & Doanh thu)

-- 1. Nâng cấp bảng users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Nâng cấp bảng facilities (Địa chỉ chuẩn hóa, Tọa độ, Maps Embed, Cloudinary, Giá tham chiếu)
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS street_address VARCHAR(300);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS normalized_address VARCHAR(600);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS maps_embed_url TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS sport_type VARCHAR(50) NOT NULL DEFAULT 'badminton';
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS min_price NUMERIC(12, 2) NOT NULL DEFAULT 80000.00;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS max_price NUMERIC(12, 2) NOT NULL DEFAULT 140000.00;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_facilities_slug ON facilities(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facilities_owner_id ON facilities(owner_id);
CREATE INDEX IF NOT EXISTS idx_facilities_city_district ON facilities(city, district);
CREATE INDEX IF NOT EXISTS idx_facilities_price ON facilities(min_price, max_price);
CREATE INDEX IF NOT EXISTS idx_facilities_coords ON facilities(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_facilities_status_approved ON facilities(status, is_approved);

-- 3. Bảng tiện ích chuẩn hóa phục vụ bộ lọc SQL (facility_amenities)
CREATE TABLE IF NOT EXISTS facility_amenities (
    facility_id BIGINT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    amenity VARCHAR(150) NOT NULL,
    PRIMARY KEY (facility_id, amenity)
);

CREATE INDEX IF NOT EXISTS idx_facility_amenities_name ON facility_amenities(amenity);

-- 4. Bảng thư viện ảnh Cloudinary của cụm sân (facility_images)
CREATE TABLE IF NOT EXISTS facility_images (
    id BIGSERIAL PRIMARY KEY,
    facility_id BIGINT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    public_id VARCHAR(255),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facility_images_facility ON facility_images(facility_id, sort_order);

-- 5. Nâng cấp bảng courts (Sân con)
ALTER TABLE courts ADD COLUMN IF NOT EXISTS court_number INT NOT NULL DEFAULT 1;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS base_price_per_hour NUMERIC(12, 2) NOT NULL DEFAULT 100000.00;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS surface_type VARCHAR(100) DEFAULT 'Thảm BWF tiêu chuẩn';
ALTER TABLE courts ADD COLUMN IF NOT EXISTS description VARCHAR(500);

-- Đánh số sân hiện có theo thứ tự tạo trong từng cụm.
WITH numbered_courts AS (
    SELECT id, row_number() OVER (PARTITION BY facility_id ORDER BY id) AS court_number
    FROM courts
)
UPDATE courts c
SET court_number = n.court_number
FROM numbered_courts n
WHERE c.id = n.id;

-- 6. Nâng cấp bảng price_rules (Bảng giá theo khung giờ, ngày áp dụng, đối tượng khách)
ALTER TABLE price_rules ALTER COLUMN court_id DROP NOT NULL;
ALTER TABLE price_rules ADD COLUMN IF NOT EXISTS facility_id BIGINT REFERENCES facilities(id) ON DELETE CASCADE;
ALTER TABLE price_rules ADD COLUMN IF NOT EXISTS name VARCHAR(150) NOT NULL DEFAULT 'Khung giờ tiêu chuẩn';
ALTER TABLE price_rules ADD COLUMN IF NOT EXISTS day_type VARCHAR(30) NOT NULL DEFAULT 'ALL';
ALTER TABLE price_rules ADD COLUMN IF NOT EXISTS customer_type VARCHAR(30) NOT NULL DEFAULT 'CASUAL';

UPDATE price_rules pr
SET facility_id = c.facility_id
FROM courts c
WHERE pr.court_id = c.id AND pr.facility_id IS NULL;

UPDATE price_rules
SET name = CASE
    WHEN start_time < '17:00:00' THEN 'Khung giờ thường ban ngày'
    ELSE 'Khung giờ vàng buổi tối'
END
WHERE name = 'Khung giờ tiêu chuẩn';

CREATE INDEX IF NOT EXISTS idx_price_rules_facility_id ON price_rules(facility_id);

-- 7. Nâng cấp bảng court_occupancies phục vụ ghi chú khóa sân bảo trì
ALTER TABLE court_occupancies ADD COLUMN IF NOT EXISTS note VARCHAR(500);
ALTER TABLE court_occupancies ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);
