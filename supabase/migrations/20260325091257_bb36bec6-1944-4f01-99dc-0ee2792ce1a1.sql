
CREATE TABLE IF NOT EXISTS public.dms_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  platform VARCHAR(50) NOT NULL,
  orsh_field VARCHAR(100) NOT NULL,
  assai_field VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(platform, orsh_field)
);

ALTER TABLE public.dms_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read field mappings"
  ON public.dms_field_mappings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage field mappings"
  ON public.dms_field_mappings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add metadata column to dms_external_sync if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'dms_external_sync'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.dms_external_sync ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
