
CREATE TABLE public.pssr_custom_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pssr_id UUID NOT NULL REFERENCES public.pssrs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  topic TEXT,
  description TEXT NOT NULL,
  supporting_evidence TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pssr_custom_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom items for their PSSRs"
  ON public.pssr_custom_checklist_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pssrs WHERE pssrs.id = pssr_custom_checklist_items.pssr_id AND pssrs.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert custom items for their PSSRs"
  ON public.pssr_custom_checklist_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pssrs WHERE pssrs.id = pssr_custom_checklist_items.pssr_id AND pssrs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update custom items for their PSSRs"
  ON public.pssr_custom_checklist_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.pssrs WHERE pssrs.id = pssr_custom_checklist_items.pssr_id AND pssrs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete custom items for their PSSRs"
  ON public.pssr_custom_checklist_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.pssrs WHERE pssrs.id = pssr_custom_checklist_items.pssr_id AND pssrs.user_id = auth.uid()
  ));
