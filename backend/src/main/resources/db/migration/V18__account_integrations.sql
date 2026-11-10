ALTER TABLE users ADD COLUMN fcm_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN calendar_connected BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN calendar_email VARCHAR(255);
CREATE TABLE user_calendar_connections (
 user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 refresh_token TEXT NOT NULL, subject VARCHAR(255) NOT NULL
);
CREATE TABLE calendar_consents (
 hash VARCHAR(64) PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_calendar_consents_user ON calendar_consents(user_id);
CREATE TABLE user_push_subscriptions (
 hash VARCHAR(64) PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token TEXT NOT NULL
);
CREATE INDEX idx_push_subscriptions_user ON user_push_subscriptions(user_id);
CREATE TABLE booking_deliveries (
 booking_id BIGINT PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
 push_status VARCHAR(32), calendar_status VARCHAR(32), locked_until TIMESTAMPTZ
);
