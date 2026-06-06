
-- 1) Lifecycle status column on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active'
  CHECK (lifecycle_status IN ('active','archived','deleted'));

UPDATE public.projects
  SET lifecycle_status = CASE WHEN is_active THEN 'active' ELSE 'deleted' END
  WHERE lifecycle_status = 'active' AND is_active = false;

CREATE INDEX IF NOT EXISTS idx_projects_lifecycle_status
  ON public.projects(lifecycle_status);

-- Keep is_active and lifecycle_status mutually consistent.
CREATE OR REPLACE FUNCTION public.sync_project_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle_status IS NULL THEN
      NEW.lifecycle_status := CASE WHEN COALESCE(NEW.is_active, true) THEN 'active' ELSE 'deleted' END;
    END IF;
    NEW.is_active := (NEW.lifecycle_status = 'active');
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    NEW.is_active := (NEW.lifecycle_status = 'active');
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    -- Legacy callers toggling is_active directly
    NEW.lifecycle_status := CASE WHEN NEW.is_active THEN 'active' ELSE 'deleted' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_lifecycle ON public.projects;
CREATE TRIGGER trg_sync_project_lifecycle
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.sync_project_lifecycle();

-- 2) Per-user hidden projects
CREATE TABLE IF NOT EXISTS public.project_user_hides (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

GRANT SELECT, INSERT, DELETE ON public.project_user_hides TO authenticated;
GRANT ALL ON public.project_user_hides TO service_role;

ALTER TABLE public.project_user_hides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_user_hides_self_select" ON public.project_user_hides;
CREATE POLICY "project_user_hides_self_select"
  ON public.project_user_hides
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "project_user_hides_self_insert" ON public.project_user_hides;
CREATE POLICY "project_user_hides_self_insert"
  ON public.project_user_hides
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "project_user_hides_self_delete" ON public.project_user_hides;
CREATE POLICY "project_user_hides_self_delete"
  ON public.project_user_hides
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_project_user_hides_project
  ON public.project_user_hides(project_id);
