
-- Add prerequisite_id column to support both vcr_items and p2a_vcr_prerequisites
ALTER TABLE public.vcr_item_delivering_parties 
  ADD COLUMN prerequisite_id UUID REFERENCES public.p2a_vcr_prerequisites(id) ON DELETE CASCADE;

-- Make vcr_item_id nullable since we may link to prerequisite instead
ALTER TABLE public.vcr_item_delivering_parties 
  ALTER COLUMN vcr_item_id DROP NOT NULL;

-- Add unique constraint for prerequisite-based assignment
CREATE UNIQUE INDEX idx_vcr_delivering_party_prereq_user 
  ON public.vcr_item_delivering_parties(prerequisite_id, user_id) 
  WHERE prerequisite_id IS NOT NULL;

-- Index for prerequisite lookups
CREATE INDEX idx_vcr_item_delivering_parties_prereq ON public.vcr_item_delivering_parties(prerequisite_id);

-- Update the shared completion trigger to also handle prerequisite-linked parties
CREATE OR REPLACE FUNCTION public.sync_vcr_delivering_party_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivering_user_ids UUID[];
BEGIN
  IF NEW.status NOT IN ('ACCEPTED', 'QUALIFICATION_APPROVED') THEN
    RETURN NEW;
  END IF;
  
  -- Get delivering parties linked to this prerequisite directly
  SELECT ARRAY_AGG(user_id) INTO v_delivering_user_ids
  FROM vcr_item_delivering_parties
  WHERE prerequisite_id = NEW.id;
  
  -- Also check by vcr_item_id if applicable
  IF v_delivering_user_ids IS NULL THEN
    SELECT ARRAY_AGG(user_id) INTO v_delivering_user_ids
    FROM vcr_item_delivering_parties
    WHERE vcr_item_id = NEW.vcr_item_id AND NEW.vcr_item_id IS NOT NULL;
  END IF;
  
  IF v_delivering_user_ids IS NULL OR array_length(v_delivering_user_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  
  UPDATE user_tasks
  SET status = 'completed', updated_at = now()
  WHERE user_id = ANY(v_delivering_user_ids)
    AND status != 'completed'
    AND (metadata->>'prerequisite_id' = NEW.id::text OR metadata->>'vcr_item_id' = NEW.vcr_item_id::text);
  
  RETURN NEW;
END;
$$;
