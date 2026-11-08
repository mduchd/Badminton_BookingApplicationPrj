-- Keep V2 unchanged for Flyway checksum compatibility and preserve court data.
UPDATE facilities SET owner_id = NULL
WHERE owner_id IN (
  SELECT id FROM users
  WHERE email IN ('customer1@example.com', 'owner1@example.com')
    AND password_hash = '$2a$10$abcdefghijklmnopqrstuvwxyz123456'
    AND NOT EXISTS (SELECT 1 FROM bookings WHERE customer_id = users.id)
);
DELETE FROM users
WHERE email IN ('customer1@example.com', 'owner1@example.com')
  AND password_hash = '$2a$10$abcdefghijklmnopqrstuvwxyz123456'
  AND NOT EXISTS (SELECT 1 FROM bookings WHERE customer_id = users.id)
  AND NOT EXISTS (SELECT 1 FROM facilities WHERE owner_id = users.id);
