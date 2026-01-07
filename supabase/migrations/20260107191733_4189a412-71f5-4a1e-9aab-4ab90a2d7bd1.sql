-- Create junction table to store selected ATI scopes per PSSR
CREATE TABLE public.pssr_selected_ati_scopes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pssr_id UUID NOT NULL REFERENCES public.pssrs(id) ON DELETE CASCADE,
  ati_scope_id UUID NOT NULL REFERENCES public.pssr_tie_in_scopes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pssr_id, ati_scope_id)
);

-- Enable RLS
ALTER TABLE public.pssr_selected_ati_scopes ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view selected ATI scopes" 
ON public.pssr_selected_ati_scopes 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert selected ATI scopes" 
ON public.pssr_selected_ati_scopes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their own selected ATI scopes" 
ON public.pssr_selected_ati_scopes 
FOR DELETE 
TO authenticated
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_pssr_selected_ati_scopes_pssr_id ON public.pssr_selected_ati_scopes(pssr_id);

-- Update the reason that should require ATI scopes (ATI reasons)
UPDATE public.pssr_reasons 
SET requires_ati_scopes = true 
WHERE name ILIKE '%Advanced Tie-in%' 
   OR name ILIKE '%ATI%'
   OR name ILIKE '%tie-in%';