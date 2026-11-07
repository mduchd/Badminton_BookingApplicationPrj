-- Flyway Migration: V1__init_auth_and_users.sql
-- Description: Khởi tạo bảng users, trigger tự động cập nhật timestamp và tài khoản mẫu

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
    provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    provider_id VARCHAR(255),
    fcm_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    fcm_token TEXT,
    calendar_connected BOOLEAN NOT NULL DEFAULT FALSE,
    calendar_email VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_role CHECK (role IN ('CUSTOMER', 'COURT_OWNER', 'SYSTEM_ADMIN')),
    CONSTRAINT chk_user_provider CHECK (provider IN ('LOCAL', 'GOOGLE')),
    CONSTRAINT chk_user_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Function và trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Seed tài khoản mẫu ban đầu (Password mặc định là 123456, hash BCrypt)
-- Hash: $2a$10$wE39yTszrVdhyvT6qB/uP.vI3fEhyc7O9x70qN7gT7lGkQz24yL1y
INSERT INTO users (id, email, password_hash, full_name, phone, role, provider, avatar_url, status)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000001',
        'admin@smashcourt.vn',
        '$2a$10$wE39yTszrVdhyvT6qB/uP.vI3fEhyc7O9x70qN7gT7lGkQz24yL1y',
        'Quản trị viên Hệ thống',
        '0901234567',
        'SYSTEM_ADMIN',
        'LOCAL',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        'ACTIVE'
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'owner@smashcourt.vn',
        '$2a$10$wE39yTszrVdhyvT6qB/uP.vI3fEhyc7O9x70qN7gT7lGkQz24yL1y',
        'Trần Văn Chủ Sân',
        '0912345678',
        'COURT_OWNER',
        'LOCAL',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        'ACTIVE'
    )
ON CONFLICT (email) DO NOTHING;
