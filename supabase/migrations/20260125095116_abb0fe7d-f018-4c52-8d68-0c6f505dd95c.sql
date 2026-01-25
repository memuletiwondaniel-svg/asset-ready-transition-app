-- Create VCR Templates table for baseline/template VCRs that can be configured in admin
CREATE TABLE public.vcr_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary TEXT NOT NULL,
  description TEXT,
  sample_evidence TEXT,
  delivering_party_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  receiving_party_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.pac_prerequisite_categories(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.vcr_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "VCR templates are viewable by authenticated users"
ON public.vcr_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage VCR templates"
ON public.vcr_templates FOR ALL
TO authenticated
USING (public.user_is_admin(auth.uid()))
WITH CHECK (public.user_is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_vcr_templates_updated_at
  BEFORE UPDATE ON public.vcr_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed VCR templates from PAC prerequisites
INSERT INTO public.vcr_templates (summary, description, sample_evidence, delivering_party_role_id, receiving_party_role_id, category_id, display_order, is_active)
SELECT 
  summary,
  description,
  sample_evidence,
  delivering_party_role_id,
  receiving_party_role_id,
  category_id,
  display_order,
  is_active
FROM public.pac_prerequisites
WHERE is_active = true
ORDER BY category_id, display_order;