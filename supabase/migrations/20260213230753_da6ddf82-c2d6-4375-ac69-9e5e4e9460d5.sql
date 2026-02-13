-- Fix category display order: DI=1, TI=2, OI=3, MS=4, HS=5
UPDATE vcr_item_categories SET display_order = 3 WHERE id = '52e040a1-4edc-4847-9fea-f8a07605fb71'; -- Operating Integrity
UPDATE vcr_item_categories SET display_order = 4 WHERE id = 'd2d6fcbd-dff4-46f3-8a1e-50e241edbfdb'; -- Management Systems
UPDATE vcr_item_categories SET display_order = 5 WHERE id = '0347791a-eaae-42ea-be42-1fb90022df38'; -- Health & Safety