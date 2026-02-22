
-- Per-PSSR item overrides for description, delivering party, and approving parties
CREATE TABLE public.pssr_item_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pssr_id UUID NOT NULL REFERENCES public.pssrs(id) ON DELETE CASCADE,
  checklist_item_id TEXT NOT NULL,
  description_override TEXT,
  responsible_override TEXT,
  approvers_override TEXT,
  topic_override TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pssr_id, checklist_item_id)
);

-- Enable RLS
ALTER TABLE public.pssr_item_overrides ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view pssr item overrides"
  ON public.pssr_item_overrides FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert pssr item overrides"
  ON public.pssr_item_overrides FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pssr item overrides"
  ON public.pssr_item_overrides FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_pssr_item_overrides_updated_at
  BEFORE UPDATE ON public.pssr_item_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
