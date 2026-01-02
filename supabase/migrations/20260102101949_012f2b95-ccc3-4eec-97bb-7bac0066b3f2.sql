-- Phase 1: Add relationship columns to existing tables

-- Add plant_id to field table
ALTER TABLE public.field 
ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plant(id);

-- Add field_id to station table
ALTER TABLE public.station 
ADD COLUMN IF NOT EXISTS field_id UUID REFERENCES public.field(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_field_plant_id ON public.field(plant_id);
CREATE INDEX IF NOT EXISTS idx_station_field_id ON public.station(field_id);

-- Migrate existing data: Link fields to CS plant
UPDATE public.field 
SET plant_id = (SELECT id FROM public.plant WHERE name = 'CS' LIMIT 1)
WHERE name IN ('West Qurna (WQ1)', 'North Rumaila', 'South Rumaila', 'Zubair')
AND plant_id IS NULL;

-- Migrate existing data: Link stations to their parent fields
-- West Qurna stations
UPDATE public.station 
SET field_id = (SELECT id FROM public.field WHERE name = 'West Qurna (WQ1)' LIMIT 1)
WHERE name IN ('CS6', 'CS7', 'CS8')
AND field_id IS NULL;

-- North Rumaila stations
UPDATE public.station 
SET field_id = (SELECT id FROM public.field WHERE name = 'North Rumaila' LIMIT 1)
WHERE name IN ('CS1', 'CS2', 'CS3', 'CS4', 'CS5', 'NCS2', 'NCS4', 'NCS5')
AND field_id IS NULL;

-- South Rumaila stations
UPDATE public.station 
SET field_id = (SELECT id FROM public.field WHERE name = 'South Rumaila' LIMIT 1)
WHERE name IN ('Markazia (MK)', 'Rafidiyah (RAF)', 'Shamiyah (SH)', 'Qurainat', 'Qurainat Sweetening', 'Qurainat Temp Comp (QTC)')
AND field_id IS NULL;

-- Zubair stations
UPDATE public.station 
SET field_id = (SELECT id FROM public.field WHERE name = 'Zubair' LIMIT 1)
WHERE name IN ('Hammar (HAM)', 'Hammar Mishrif (HM)', 'Hammar New TEG (HNT)', 'Zubair (ZB)', 'Zubair Mishrif (ZM)', 'Zubair Temp Comp (ZTC)')
AND field_id IS NULL;