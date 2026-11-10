-- Apply only to the isolated badminton_ai_test database.
INSERT INTO facilities(id,name,address,city,district,sport_type,is_approved,status)
VALUES (900000001,'Verification Facility','Verification address','Hà Nội','Verification','badminton',true,'ACTIVE')
ON CONFLICT (id) DO NOTHING;
INSERT INTO courts(id,facility_id,name,base_price_per_hour,status)
VALUES (900000002,900000001,'Verification Court 1',120000,'ACTIVE')
ON CONFLICT (id) DO NOTHING;
