-- V6: Thêm cột avatar_url vào bảng users để lưu ảnh đại diện Google
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
