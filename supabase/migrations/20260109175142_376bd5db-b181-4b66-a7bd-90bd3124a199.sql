-- Update responsible_person for all maintenance batches with specific names
-- ARB batches - Mushtaq Nawaz, Ben Chiong
UPDATE ora_maintenance_batches 
SET responsible_person = CASE batch_number 
  WHEN 1 THEN 'Mushtaq Nawaz'
  WHEN 2 THEN 'Ben Chiong'
  WHEN 3 THEN 'Mushtaq Nawaz'
END
WHERE component_type = 'ARB';

-- PMS batches - Mushtaq Nawaz, Ben Chiong
UPDATE ora_maintenance_batches 
SET responsible_person = CASE batch_number 
  WHEN 1 THEN 'Ben Chiong'
  WHEN 2 THEN 'Mushtaq Nawaz'
  WHEN 3 THEN 'Ben Chiong'
END
WHERE component_type = 'PMS';

-- IMS batches - Mushtaq Nawaz, Ben Chiong
UPDATE ora_maintenance_batches 
SET responsible_person = CASE batch_number 
  WHEN 1 THEN 'Mushtaq Nawaz'
  WHEN 2 THEN 'Ben Chiong'
END
WHERE component_type = 'IMS';

-- BOM batches - Poojan Joshi, Maharsh Seth
UPDATE ora_maintenance_batches 
SET responsible_person = CASE batch_number 
  WHEN 1 THEN 'Poojan Joshi'
  WHEN 2 THEN 'Maharsh Seth'
END
WHERE component_type = 'BOM';

-- 2Y_SPARES batches - Poojan Joshi, Maharsh Seth
UPDATE ora_maintenance_batches 
SET responsible_person = CASE batch_number 
  WHEN 1 THEN 'Poojan Joshi'
  WHEN 2 THEN 'Maharsh Seth'
  WHEN 3 THEN 'Poojan Joshi'
END
WHERE component_type = '2Y_SPARES';