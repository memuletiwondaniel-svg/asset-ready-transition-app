
CREATE OR REPLACE FUNCTION public.generate_ora_activity_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE 
  phase_prefix TEXT;
  parent_code TEXT;
  next_num INTEGER;
BEGIN
  -- If this is a child activity, generate hierarchical code
  IF NEW.parent_activity_id IS NOT NULL THEN
    -- Get parent's activity_code
    SELECT activity_code INTO parent_code
    FROM public.ora_activity_catalog
    WHERE id = NEW.parent_activity_id;

    IF parent_code IS NULL THEN
      RAISE EXCEPTION 'Parent activity not found';
    END IF;

    -- Count existing children of this parent
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(activity_code FROM '\.(\d+)$') AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM public.ora_activity_catalog
    WHERE parent_activity_id = NEW.parent_activity_id
      AND activity_code LIKE parent_code || '.%'
      AND activity_code !~ (regexp_replace(parent_code, '([.\\])', '\\\1', 'g') || '\.\d+\.');

    NEW.activity_code := parent_code || '.' || LPAD(next_num::TEXT, 2, '0');
    
    -- Auto-inherit phase from parent if not explicitly set
    IF NEW.phase_id IS NULL THEN
      SELECT phase_id INTO NEW.phase_id
      FROM public.ora_activity_catalog
      WHERE id = NEW.parent_activity_id;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Root-level activity: existing phase-prefix logic
  IF NEW.phase_id IS NOT NULL THEN
    SELECT prefix INTO phase_prefix FROM public.orp_phases WHERE id = NEW.phase_id;
  END IF;

  IF phase_prefix IS NULL THEN
    phase_prefix := 'GEN';
  END IF;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(activity_code FROM '-(\d+)$') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM public.ora_activity_catalog
  WHERE activity_code ~ ('^' || phase_prefix || '-\d+$');

  NEW.activity_code := phase_prefix || '-' || LPAD(next_num::TEXT, 2, '0');
  RETURN NEW;
END; $function$;
