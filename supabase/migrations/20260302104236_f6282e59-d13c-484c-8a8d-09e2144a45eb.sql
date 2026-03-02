
-- ============================================================
-- 1. AUDIT LOG IMMUTABILITY: Deny UPDATE and DELETE on audit_logs
-- ============================================================

-- Ensure RLS is enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Deny all UPDATE operations on audit_logs (append-only)
CREATE POLICY "audit_logs_no_update"
ON public.audit_logs
FOR UPDATE
TO authenticated
USING (false);

-- Deny all DELETE operations on audit_logs (except via purge function which uses SECURITY DEFINER)
CREATE POLICY "audit_logs_no_delete"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (false);

-- ============================================================
-- 2. ROLE INHERITANCE: Add parent_role_id to roles table
-- ============================================================

ALTER TABLE public.roles
ADD COLUMN IF NOT EXISTS parent_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- Create a function that resolves inherited permissions (walks up the role hierarchy)
CREATE OR REPLACE FUNCTION public.get_inherited_permissions(_role_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE role_chain AS (
    -- Start with the given role
    SELECT id, parent_role_id FROM public.roles WHERE id = _role_id
    UNION ALL
    -- Walk up the chain
    SELECT r.id, r.parent_role_id
    FROM public.roles r
    JOIN role_chain rc ON r.id = rc.parent_role_id
  )
  SELECT COALESCE(
    ARRAY_AGG(DISTINCT rp.permission::text),
    ARRAY[]::text[]
  )
  FROM role_chain rc
  JOIN public.role_permissions rp ON rp.role_id = rc.id;
$$;

-- ============================================================
-- 3. LEAST-PRIVILEGE DEFAULTS: Create a default 'Viewer' role 
--    and auto-assign to new users via trigger
-- ============================================================

-- Insert a default 'Viewer' role if it doesn't exist
INSERT INTO public.roles (name, description, is_active, display_order)
SELECT 'Viewer', 'Default minimal-access role assigned to all new users. View-only permissions.', true, 999
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'Viewer');

-- Create trigger function to assign default role on new profile creation
CREATE OR REPLACE FUNCTION public.assign_default_role_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_role_id uuid;
BEGIN
  -- Only assign if no role is already set
  IF NEW.role IS NULL THEN
    SELECT id INTO v_default_role_id FROM public.roles WHERE name = 'Viewer' AND is_active = true LIMIT 1;
    IF v_default_role_id IS NOT NULL THEN
      NEW.role := v_default_role_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger (drop first if exists to be safe)
DROP TRIGGER IF EXISTS trg_assign_default_role ON public.profiles;
CREATE TRIGGER trg_assign_default_role
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_role_to_new_user();
