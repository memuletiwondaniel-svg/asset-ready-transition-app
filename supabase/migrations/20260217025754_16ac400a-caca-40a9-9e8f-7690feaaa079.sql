-- Create table for per-VCR local overrides of VCR items
-- This allows editing VCR item properties per-VCR without affecting the master vcr_items table
CREATE TABLE public.p2a_vcr_item_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  vcr_item_id UUID NOT NULL REFERENCES public.vcr_items(id) ON DELETE CASCADE,
  vcr_item_override TEXT,
  topic_override TEXT,
  delivering_party_role_id_override UUID REFERENCES public.roles(id),
  approving_party_role_ids_override UUID[],
  guidance_notes_override TEXT,
  supporting_evidence_override TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(handover_point_id, vcr_item_id)
);

-- Enable RLS
ALTER TABLE public.p2a_vcr_item_overrides ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage overrides
CREATE POLICY "Authenticated users can view overrides"
  ON public.p2a_vcr_item_overrides FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert overrides"
  ON public.p2a_vcr_item_overrides FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update overrides"
  ON public.p2a_vcr_item_overrides FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete overrides"
  ON public.p2a_vcr_item_overrides FOR DELETE
  TO authenticated USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_p2a_vcr_item_overrides_updated_at
  BEFORE UPDATE ON public.p2a_vcr_item_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast lookups
CREATE INDEX idx_p2a_vcr_item_overrides_hp ON public.p2a_vcr_item_overrides(handover_point_id);
CREATE INDEX idx_p2a_vcr_item_overrides_item ON public.p2a_vcr_item_overrides(vcr_item_id);