
-- 1. Add handover_point_id column to track which VCR instance the assignment belongs to
ALTER TABLE public.vcr_item_delivering_parties 
ADD COLUMN handover_point_id uuid REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE;

-- 2. Create index for efficient lookups
CREATE INDEX idx_vcr_delivering_parties_handover_point 
ON public.vcr_item_delivering_parties(handover_point_id);

-- 3. Create the hub/region validation function
CREATE OR REPLACE FUNCTION public.validate_delivering_party_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_project_hub_id uuid;
  v_project_hub_name text;
  v_user_position text;
  v_user_hub_id uuid;
  v_portfolio text;
  v_position_lower text;
  v_hub_name_lower text;
BEGIN
  -- Skip validation if no handover_point_id provided
  IF NEW.handover_point_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve project_id from handover_point -> handover_plan -> project
  SELECT hp2.project_id INTO v_project_id
  FROM p2a_handover_points hp
  JOIN p2a_handover_plans hp2 ON hp2.id = hp.handover_plan_id
  WHERE hp.id = NEW.handover_point_id;

  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get project hub
  SELECT hub_id INTO v_project_hub_id
  FROM projects
  WHERE id = v_project_id;

  IF v_project_hub_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get hub name
  SELECT lower(name) INTO v_project_hub_name
  FROM hubs
  WHERE id = v_project_hub_id;

  IF v_project_hub_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get user profile
  SELECT position, hub INTO v_user_position, v_user_hub_id
  FROM profiles
  WHERE user_id = NEW.user_id;

  -- Direct hub UUID match = always allowed
  IF v_user_hub_id IS NOT NULL AND v_user_hub_id = v_project_hub_id THEN
    RETURN NEW;
  END IF;

  -- Determine portfolio for the project hub
  v_portfolio := CASE v_project_hub_name
    WHEN 'zubair' THEN 'central'
    WHEN 'central' THEN 'central'
    WHEN 'uq' THEN 'central'
    WHEN 'uq pipelines' THEN 'central'
    WHEN 'uq full ref' THEN 'central'
    WHEN 'uq condensate chiller pkg' THEN 'central'
    WHEN 'uq train f package' THEN 'central'
    WHEN 'pipelines' THEN 'central'
    WHEN 'north' THEN 'north'
    WHEN 'west qurna' THEN 'north'
    WHEN 'kaz' THEN 'north'
    WHEN 'nrngl, bngl & nr/sr' THEN 'south'
    ELSE v_project_hub_name
  END;

  -- Normalize user position for matching
  v_position_lower := lower(COALESCE(v_user_position, ''));
  v_position_lower := replace(replace(v_position_lower, chr(8211), '-'), chr(8212), '-');

  -- Skip asset-level positions
  IF v_position_lower LIKE '%asset%' THEN
    RAISE EXCEPTION 'User position indicates asset-level role, not compatible with project hub'
    USING ERRCODE = 'check_violation';
  END IF;

  -- Hub keyword matching
  v_hub_name_lower := v_project_hub_name;
  IF v_position_lower LIKE '%' || v_hub_name_lower || '%' THEN
    RETURN NEW;
  END IF;

  -- Portfolio matching
  IF v_position_lower LIKE '%' || v_portfolio || '%' THEN
    RETURN NEW;
  END IF;

  -- Check if position has ANY known location indicator
  IF v_position_lower ~ '(zubair|north|south|central|uq|kaz|west qurna|nrngl|bngl|nr/sr|pipelines|bfm)' THEN
    RAISE EXCEPTION 'User location mismatch: position "%" does not match project hub "%"', 
      v_user_position, v_project_hub_name
    USING ERRCODE = 'check_violation';
  END IF;

  -- If user has a different hub UUID set, reject
  IF v_user_hub_id IS NOT NULL AND v_user_hub_id != v_project_hub_id THEN
    RAISE EXCEPTION 'User hub does not match project hub for delivering party assignment'
    USING ERRCODE = 'check_violation';
  END IF;

  -- No location info at all = allow (generic/unlocated user)
  RETURN NEW;
END;
$$;

-- 4. Create the trigger
CREATE TRIGGER validate_delivering_party_location_trigger
BEFORE INSERT ON public.vcr_item_delivering_parties
FOR EACH ROW
EXECUTE FUNCTION public.validate_delivering_party_location();
