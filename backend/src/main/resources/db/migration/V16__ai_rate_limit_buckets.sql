CREATE TABLE ai_rate_limit_buckets (
    client_hash VARCHAR(64) NOT NULL,
    bucket_started_at TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count > 0),
    PRIMARY KEY (client_hash, bucket_started_at)
);
CREATE INDEX idx_ai_rate_limit_bucket_cleanup ON ai_rate_limit_buckets(bucket_started_at);
