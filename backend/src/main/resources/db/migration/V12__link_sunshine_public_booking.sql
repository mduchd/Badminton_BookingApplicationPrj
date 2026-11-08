-- The catalog code for Sunshine in Hóc Môn differs from its public booking slug.
UPDATE alobooking_public_facility_profiles profile
SET booking_url = COALESCE(profile.booking_url, 'https://datlich.alobo.vn/san/sport_sunshine'),
    booking_source_url = COALESCE(
        profile.booking_source_url,
        'https://www.alobo.vn/khai-truong-san-cau-long-pickleball-sunshine/'
    )
FROM facilities facility
WHERE facility.id = profile.facility_id
  AND facility.slug = 'alobooking-sport_sunshine_hoc_mon'
  AND profile.alobooking_code = 'sport_sunshine_hoc_mon'
  AND (profile.booking_url IS NULL OR profile.booking_url = 'https://datlich.alobo.vn/san/sport_sunshine')
  AND (profile.booking_url IS NULL OR profile.booking_source_url IS NULL);
