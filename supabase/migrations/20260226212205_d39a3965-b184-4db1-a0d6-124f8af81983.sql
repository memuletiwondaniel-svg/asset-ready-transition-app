-- Add prefix column to orp_phases
ALTER TABLE public.orp_phases ADD COLUMN prefix TEXT;

-- Update phases with prefixes
UPDATE public.orp_phases SET prefix = 'IDN' WHERE code = 'IDENTIFY';
UPDATE public.orp_phases SET prefix = 'ASS' WHERE code = 'ASSESS';
UPDATE public.orp_phases SET prefix = 'SEL' WHERE code = 'SELECT';
UPDATE public.orp_phases SET prefix = 'DEF' WHERE code = 'DEFINE';
UPDATE public.orp_phases SET prefix = 'EXE' WHERE code = 'EXECUTE';
UPDATE public.orp_phases SET prefix = 'OPR' WHERE code = 'OPERATE';

-- Make prefix NOT NULL after populating
ALTER TABLE public.orp_phases ALTER COLUMN prefix SET NOT NULL;
ALTER TABLE public.orp_phases ADD CONSTRAINT orp_phases_prefix_unique UNIQUE (prefix);

-- Replace the activity code generation function to use phase prefix
CREATE OR REPLACE FUNCTION public.generate_ora_activity_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE 
  phase_prefix TEXT;
  next_num INTEGER;
BEGIN
  -- Get phase prefix
  IF NEW.phase_id IS NOT NULL THEN
    SELECT prefix INTO phase_prefix FROM public.orp_phases WHERE id = NEW.phase_id;
  END IF;

  -- Fallback if no phase assigned
  IF phase_prefix IS NULL THEN
    phase_prefix := 'GEN';
  END IF;

  -- Get next serial number within this phase
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(activity_code FROM '-(\d+)$') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM public.ora_activity_catalog
  WHERE activity_code LIKE phase_prefix || '-%';

  NEW.activity_code := phase_prefix || '-' || LPAD(next_num::TEXT, 2, '0');
  RETURN NEW;
END; $$;