-- Update the category name from "Start-up after Operational Changes or Major Maintenance" to "Operational Changes or Major Maintenance"
UPDATE pssr_reason_categories 
SET name = 'Operational Changes or Major Maintenance', updated_at = now()
WHERE code = 'OPS_MTCE';