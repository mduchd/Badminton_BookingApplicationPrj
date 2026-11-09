ALTER TABLE bookings ADD COLUMN idempotency_key VARCHAR(128);
CREATE UNIQUE INDEX uq_booking_customer_idempotency ON bookings(customer_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
