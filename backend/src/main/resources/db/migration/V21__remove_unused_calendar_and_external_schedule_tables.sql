-- Calendar synchronization uses booking_deliveries and user_calendar_connections.
-- The old booking link table and the unimplemented external schedule cache are unused.
-- Deliberately omit CASCADE: unexpected dependencies must stop the migration.
DROP TABLE IF EXISTS booking_calendar_links;
DROP TABLE IF EXISTS alobooking_schedule_slots;
