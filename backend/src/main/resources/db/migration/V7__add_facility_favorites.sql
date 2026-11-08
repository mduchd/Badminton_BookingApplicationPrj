CREATE TABLE user_favorite_facilities (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facility_id BIGINT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, facility_id)
);

CREATE INDEX idx_user_favorite_facilities_facility_id ON user_favorite_facilities(facility_id);
