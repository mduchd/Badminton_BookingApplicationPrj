-- Seed test data phục vụ phát triển & kiểm thử

-- 1. Tài khoản mẫu
INSERT INTO users (id, email, password_hash, full_name, phone, role, status)
VALUES 
    (1, 'customer1@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Nguyễn Văn Khách', '0987654321', 'CUSTOMER', 'ACTIVE'),
    (2, 'owner1@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Trần Văn Chủ Sân', '0912345678', 'OWNER', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Đồng bộ sequence users
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));

-- 2. Cụm sân mẫu
INSERT INTO facilities (id, owner_id, name, city, district, ward, address, latitude, longitude, open_time, close_time, status)
VALUES 
    (1, 2, 'CLB Cầu Lông Cầu Giấy Pro', 'Hà Nội', 'Cầu Giấy', 'Dịch Vọng Hậu', 'Số 35 Phố Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội', 21.0313, 105.7831, '05:00:00', '23:00:00', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval('facilities_id_seq', (SELECT COALESCE(MAX(id), 1) FROM facilities));

-- 3. Sân con mẫu
INSERT INTO courts (id, facility_id, name, court_type, status)
VALUES 
    (1, 1, 'Sân 1 (Thảm Yonex)', 'STANDARD', 'ACTIVE'),
    (2, 1, 'Sân 2 (Thảm Yonex)', 'STANDARD', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval('courts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM courts));

-- 4. Bảng giá mẫu cho Sân 1 và Sân 2
-- Khung giờ ngày thường 05:00 - 17:00: 80.000 VNĐ / giờ
-- Khung giờ vàng 17:00 - 23:00: 140.000 VNĐ / giờ
INSERT INTO price_rules (id, court_id, day_of_week, start_time, end_time, price_per_slot, slot_duration_minutes)
VALUES 
    (1, 1, 0, '05:00:00', '17:00:00', 80000.00, 60),
    (2, 1, 0, '17:00:00', '23:00:00', 140000.00, 60),
    (3, 2, 0, '05:00:00', '17:00:00', 80000.00, 60),
    (4, 2, 0, '17:00:00', '23:00:00', 140000.00, 60)
ON CONFLICT (id) DO NOTHING;

SELECT setval('price_rules_id_seq', (SELECT COALESCE(MAX(id), 1) FROM price_rules));
