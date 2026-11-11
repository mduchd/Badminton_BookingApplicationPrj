-- The owner form stores multiple contact numbers and their descriptions together.
ALTER TABLE facilities ALTER COLUMN phone TYPE VARCHAR(300);

-- Keep SQL inserts consistent with newly registered owner facilities.
-- Existing approved catalog entries retain their saved values.
ALTER TABLE facilities ALTER COLUMN status SET DEFAULT 'PENDING_APPROVAL';
ALTER TABLE facilities ALTER COLUMN is_approved SET DEFAULT FALSE;
