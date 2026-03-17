
-- Junction table for VCR item individual delivering parties
CREATE TABLE public.vcr_item_delivering_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vcr_item_id UUID NOT NULL REFERENCES public.vcr_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vcr_item_id, user_id)
);

-- Enable RLS
ALTER TABLE public.vcr_item_delivering_parties ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read, insert, delete
CREATE POLICY "Authenticated users can view delivering parties"
ON public.vcr_item_delivering_parties FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can add delivering parties"
ON public.vcr_item_delivering_parties FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can remove delivering parties"
ON public.vcr_item_delivering_parties FOR DELETE TO authenticated USING (true);

-- Index for fast lookups
CREATE INDEX idx_vcr_item_delivering_parties_item ON public.vcr_item_delivering_parties(vcr_item_id);
CREATE INDEX idx_vcr_item_delivering_parties_user ON public.vcr_item_delivering_parties(user_id);

-- Trigger: when one delivering party completes (via p2a_vcr_prerequisites status change to ACCEPTED),
-- mark all delivering party tasks for this VCR item as completed
CREATE OR REPLACE FUNCTION public.sync_vcr_delivering_party_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vcr_item_id UUID;
  v_delivering_user_ids UUID[];
BEGIN
  -- Only trigger on status change to ACCEPTED or QUALIFICATION_APPROVED
  IF NEW.status NOT IN ('ACCEPTED', 'QUALIFICATION_APPROVED') THEN
    RETURN NEW;
  END IF;
  
  -- Find the VCR item linked to this prerequisite
  SELECT vcr_item_id INTO v_vcr_item_id FROM p2a_vcr_prerequisites WHERE id = NEW.id;
  IF v_vcr_item_id IS NULL THEN RETURN NEW; END IF;
  
  -- Get all delivering party user IDs for this VCR item
  SELECT ARRAY_AGG(user_id) INTO v_delivering_user_ids
  FROM vcr_item_delivering_parties
  WHERE vcr_item_id = v_vcr_item_id;
  
  IF v_delivering_user_ids IS NULL OR array_length(v_delivering_user_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Mark all related user_tasks as completed for all delivering parties
  UPDATE user_tasks
  SET status = 'completed', updated_at = now()
  WHERE user_id = ANY(v_delivering_user_ids)
    AND status != 'completed'
    AND metadata->>'vcr_item_id' = v_vcr_item_id::text;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vcr_delivering_party_shared_completion
  AFTER UPDATE OF status ON public.p2a_vcr_prerequisites
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.sync_vcr_delivering_party_completion();
