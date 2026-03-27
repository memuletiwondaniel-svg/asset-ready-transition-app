ALTER TABLE dms_document_type_acronyms 
  ADD COLUMN IF NOT EXISTS is_learned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS learned_from_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_acronym_usage(acronym_text text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE dms_document_type_acronyms 
  SET usage_count = usage_count + 1 
  WHERE acronym = acronym_text;
$$;