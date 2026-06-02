-- Persisted catalog of every system known to GoCompletions, populated by admin Sync.
CREATE TABLE public.gohub_synced_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tile_name TEXT NOT NULL,
  system_id TEXT NOT NULL,
  normalized_id TEXT NOT NULL,
  name TEXT,
  raw JSONB,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT gohub_synced_systems_tile_system_unique UNIQUE (tile_name, system_id)
);

CREATE INDEX idx_gohub_synced_systems_normalized_id ON public.gohub_synced_systems (normalized_id);
CREATE INDEX idx_gohub_synced_systems_tile ON public.gohub_synced_systems (tile_name);
CREATE INDEX idx_gohub_synced_systems_synced_at ON public.gohub_synced_systems (synced_at DESC);

GRANT SELECT ON public.gohub_synced_systems TO authenticated;
GRANT ALL ON public.gohub_synced_systems TO service_role;

ALTER TABLE public.gohub_synced_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read gohub catalog"
ON public.gohub_synced_systems
FOR SELECT
TO authenticated
USING (true);

-- Health-check helper: returns per-tile freshness and counts.
CREATE OR REPLACE FUNCTION public.gohub_catalog_freshness()
RETURNS TABLE (
  tile_name TEXT,
  system_count BIGINT,
  last_synced_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tile_name,
    COUNT(*) AS system_count,
    MAX(synced_at) AS last_synced_at
  FROM public.gohub_synced_systems
  GROUP BY tile_name
  ORDER BY tile_name;
$$;

GRANT EXECUTE ON FUNCTION public.gohub_catalog_freshness() TO authenticated, service_role;