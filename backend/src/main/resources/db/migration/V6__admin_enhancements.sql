-- V3: Bổ sung bảng cài đặt hệ thống và trường đối soát/kiểm duyệt cho Quản trị viên (Platform Admin)

-- 1. Bảng system_settings (Cấu hình toàn sàn lưu database)
CREATE TABLE IF NOT EXISTS system_settings (
    id BIGINT PRIMARY KEY,
    commission_rate_percent DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    hold_minutes INT NOT NULL DEFAULT 10,
    platform_name VARCHAR(255) NOT NULL DEFAULT 'SmashCourt Badminton Booking Platform',
    hotline VARCHAR(50) NOT NULL DEFAULT '1900 6868',
    support_email VARCHAR(255) NOT NULL DEFAULT 'support@smashcourt.vn',
    broadcast_announcement TEXT DEFAULT 'Chào mừng đến với Nền tảng Đặt sân Cầu lông Toàn quốc SmashCourt!',
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    system_amenities_json TEXT DEFAULT '["Đèn chiếu sáng tiêu chuẩn BWF","Điều hòa nhiệt độ","Bãi đỗ xe ô tô & xe máy","Căn tin giải khát & quầy đồ ăn","Dịch vụ cho thuê vợt & bán quả cầu","Wifi tốc độ cao miễn phí","Tủ đồ cá nhân an toàn","Phòng tắm & thay đồ nóng lạnh"]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- Khởi tạo cấu hình mặc định (Singleton record id = 1)
INSERT INTO system_settings (
    id, commission_rate_percent, hold_minutes, platform_name, hotline, support_email, broadcast_announcement, maintenance_mode
) VALUES (
    1, 5.0, 10, 'SmashCourt Badminton Booking Platform', '1900 6868', 'support@smashcourt.vn', 'Chào mừng đến với Nền tảng Đặt sân Cầu lông Toàn quốc SmashCourt!', FALSE
) ON CONFLICT (id) DO NOTHING;

-- 2. Thêm trường rejection_reason vào facilities để lưu lý do từ chối kiểm duyệt
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Thêm trường commission_rate và commission_amount vào payments để snapshot số liệu tài chính bất biến
ALTER TABLE payments ADD COLUMN IF NOT EXISTS commission_rate DOUBLE PRECISION;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12, 2);
