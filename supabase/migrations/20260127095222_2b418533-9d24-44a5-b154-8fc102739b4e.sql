-- Create table for VCR relationships (prerequisite/dependent)
CREATE TABLE public.p2a_vcr_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_vcr_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  target_vcr_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('PREREQUISITE', 'DEPENDENT')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate relationships
  UNIQUE(source_vcr_id, target_vcr_id, relationship_type)
);

-- Enable RLS
ALTER TABLE public.p2a_vcr_relationships ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to manage VCR relationships
CREATE POLICY "Authenticated users can view VCR relationships"
  ON public.p2a_vcr_relationships
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create VCR relationships"
  ON public.p2a_vcr_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete VCR relationships"
  ON public.p2a_vcr_relationships
  FOR DELETE
  TO authenticated
  USING (true);

-- Add index for faster lookups
CREATE INDEX idx_vcr_relationships_source ON public.p2a_vcr_relationships(source_vcr_id);
CREATE INDEX idx_vcr_relationships_target ON public.p2a_vcr_relationships(target_vcr_id);