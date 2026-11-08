-- Remove only the unchanged example facility from V2. Preserve any facility
-- that has acquired bookings, occupancies, extra courts, or changed price rules.
DELETE FROM facilities f
WHERE f.id = 1
  AND f.owner_id IS NULL
  AND f.name = 'CLB Cầu Lông Cầu Giấy Pro'
  AND f.address = 'Số 35 Phố Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội'
  AND f.city = 'Hà Nội' AND f.district = 'Cầu Giấy' AND f.ward = 'Dịch Vọng Hậu'
  AND f.latitude = 21.0313 AND f.longitude = 105.7831
  AND f.open_time = TIME '05:00' AND f.close_time = TIME '23:00' AND f.status = 'ACTIVE'
  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.facility_id = f.id)
  AND NOT EXISTS (SELECT 1 FROM court_occupancies o JOIN courts c ON c.id = o.court_id WHERE c.facility_id = f.id)
  AND (SELECT count(*) FROM courts c WHERE c.facility_id = f.id) = 2
  AND EXISTS (SELECT 1 FROM courts c WHERE c.id = 1 AND c.facility_id = f.id AND c.name = 'Sân 1 (Thảm Yonex)' AND c.court_type = 'STANDARD' AND c.status = 'ACTIVE')
  AND EXISTS (SELECT 1 FROM courts c WHERE c.id = 2 AND c.facility_id = f.id AND c.name = 'Sân 2 (Thảm Yonex)' AND c.court_type = 'STANDARD' AND c.status = 'ACTIVE')
  AND (SELECT count(*) FROM price_rules p JOIN courts c ON c.id = p.court_id WHERE c.facility_id = f.id) = 4
  AND (SELECT count(*) FROM price_rules p JOIN courts c ON c.id = p.court_id WHERE c.facility_id = f.id
       AND p.day_of_week = 0 AND p.slot_duration_minutes = 60 AND p.effective_from IS NULL AND p.effective_to IS NULL
       AND ((p.id IN (1, 3) AND p.court_id = (p.id + 1) / 2 AND p.start_time = TIME '05:00' AND p.end_time = TIME '17:00' AND p.price_per_slot = 80000)
         OR (p.id IN (2, 4) AND p.court_id = p.id / 2 AND p.start_time = TIME '17:00' AND p.end_time = TIME '23:00' AND p.price_per_slot = 140000))) = 4;
