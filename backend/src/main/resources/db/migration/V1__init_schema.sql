-- 0. Kích hoạt btree_gist để tạo exclusion constraint trên kiểu dữ liệu bigint và tstzrange
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Bảng users (TV1 - Người dùng & Xác thực)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
    provider VARCHAR(50) DEFAULT 'LOCAL',
    provider_subject VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng facilities (TV2 - Cụm sân)
CREATE TABLE IF NOT EXISTS facilities (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    district VARCHAR(100),
    ward VARCHAR(100),
    address VARCHAR(500) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    open_time TIME NOT NULL DEFAULT '05:00:00',
    close_time TIME NOT NULL DEFAULT '23:00:00',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facilities_district ON facilities(district);

-- 3. Bảng courts (TV2 - Sân con thuộc cụm sân)
CREATE TABLE IF NOT EXISTS courts (
    id BIGSERIAL PRIMARY KEY,
    facility_id BIGINT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    court_type VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courts_facility_id ON courts(facility_id);

-- 4. Bảng price_rules (TV2 / TV3 - Bảng giá theo khung giờ)
CREATE TABLE IF NOT EXISTS price_rules (
    id BIGSERIAL PRIMARY KEY,
    court_id BIGINT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL DEFAULT 0, -- 0: tất cả các ngày, 1: Thứ 2 ... 7: Chủ nhật
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price_per_slot NUMERIC(12, 2) NOT NULL, -- Giá cho mỗi slot (1 giờ hoặc 30 phút)
    slot_duration_minutes INT NOT NULL DEFAULT 60,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_rules_court ON price_rules(court_id, day_of_week);

-- 5. Bảng bookings (TV3 - Quản lý đơn đặt sân)
CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES users(id),
    facility_id BIGINT NOT NULL REFERENCES facilities(id),
    court_id BIGINT NOT NULL REFERENCES courts(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    status VARCHAR(50) NOT NULL DEFAULT 'HELD', -- HELD, PENDING_PAYMENT, CONFIRMED, COMPLETED, CANCELLED, EXPIRED
    hold_expires_at TIMESTAMPTZ,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON bookings(court_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status_expires ON bookings(status, hold_expires_at);

-- 6. Bảng court_occupancies (TV3 - Chống trùng lịch bằng PostgreSQL Exclusion Constraint)
CREATE TABLE IF NOT EXISTS court_occupancies (
    id BIGSERIAL PRIMARY KEY,
    court_id BIGINT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    occupancy_type VARCHAR(50) NOT NULL, -- HOLD, BOOKING, MAINTENANCE
    active_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, RELEASED
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_court_occupancies_active_court ON court_occupancies(court_id, start_at, end_at) WHERE (active_status = 'ACTIVE');

-- Exclusion constraint đảm bảo không bao giờ có 2 khoảng thời gian của cùng 1 sân giao nhau khi đang ACTIVE
ALTER TABLE court_occupancies
ADD CONSTRAINT exclude_overlapping_court_schedule
EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
) WHERE (active_status = 'ACTIVE');

-- 7. Bảng payments (TV3 - Giao dịch thanh toán payOS / Mock)
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- PAYOS, MOCK
    provider_order_code BIGINT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, EXPIRED
    transaction_ref VARCHAR(255),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_code ON payments(provider_order_code);

-- 8. Bảng payment_webhook_events (TV3 - Nhật ký Webhook phục vụ Idempotency)
CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id BIGSERIAL PRIMARY KEY,
    provider_event_key VARCHAR(255) NOT NULL UNIQUE,
    order_code BIGINT,
    raw_payload_hash VARCHAR(255),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    result VARCHAR(50) NOT NULL
);

-- 9. Bảng booking_calendar_links (TV3 - Đồng bộ Google Calendar)
CREATE TABLE IF NOT EXISTS booking_calendar_links (
    booking_id BIGINT PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255),
    sync_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    last_synced_at TIMESTAMPTZ
);
