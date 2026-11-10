ALTER TABLE users ADD COLUMN token_version BIGINT NOT NULL DEFAULT 0;
CREATE TABLE password_reset_tokens (
    hash VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id, created_at DESC);
