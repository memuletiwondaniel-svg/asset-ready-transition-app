
-- Junction table: VCR template <-> VCR items
CREATE TABLE public.vcr_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.vcr_templates(id) ON DELETE CASCADE,
  vcr_item_id UUID NOT NULL REFERENCES public.vcr_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, vcr_item_id)
);

-- Junction table: VCR template <-> approver roles
CREATE TABLE public.vcr_template_approvers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.vcr_templates(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, role_id)
);

-- Enable RLS
ALTER TABLE public.vcr_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vcr_template_approvers ENABLE ROW LEVEL SECURITY;

-- Policies for vcr_template_items
CREATE POLICY "Authenticated users can view vcr_template_items" ON public.vcr_template_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert vcr_template_items" ON public.vcr_template_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update vcr_template_items" ON public.vcr_template_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete vcr_template_items" ON public.vcr_template_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- Policies for vcr_template_approvers
CREATE POLICY "Authenticated users can view vcr_template_approvers" ON public.vcr_template_approvers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert vcr_template_approvers" ON public.vcr_template_approvers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update vcr_template_approvers" ON public.vcr_template_approvers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete vcr_template_approvers" ON public.vcr_template_approvers FOR DELETE USING (auth.uid() IS NOT NULL);
