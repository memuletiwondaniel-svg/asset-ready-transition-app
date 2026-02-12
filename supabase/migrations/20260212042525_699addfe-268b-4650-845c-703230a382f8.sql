
CREATE TABLE public.vcr_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.vcr_item_categories(id),
  vcr_item TEXT NOT NULL,
  supporting_evidence TEXT,
  guidance_notes TEXT,
  delivering_party_role_id UUID REFERENCES public.roles(id),
  approving_party_role_ids UUID[] DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vcr_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active VCR items"
  ON public.vcr_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert VCR items"
  ON public.vcr_items FOR INSERT
  WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can update VCR items"
  ON public.vcr_items FOR UPDATE
  USING (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete VCR items"
  ON public.vcr_items FOR DELETE
  USING (public.user_is_admin(auth.uid()));

CREATE TRIGGER update_vcr_items_updated_at
  BEFORE UPDATE ON public.vcr_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
