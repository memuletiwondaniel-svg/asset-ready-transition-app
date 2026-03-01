
-- Create permission enum
CREATE TYPE public.app_permission AS ENUM (
  'create_project',
  'create_vcr',
  'create_pssr',
  'approve_pssr',
  'approve_sof',
  'manage_users',
  'access_admin',
  'view_reports',
  'create_ora_plan',
  'manage_p2a',
  'manage_orm',
  'create_p2a_plan'
);

-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission public.app_permission NOT NULL,
  granted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert role_permissions"
  ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can update role_permissions"
  ON public.role_permissions FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete role_permissions"
  ON public.role_permissions FOR DELETE TO authenticated
  USING (public.user_is_admin(auth.uid()));

-- has_permission function (profiles.role is UUID)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission public.app_permission)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    JOIN public.profiles p ON p.role = rp.role_id
    WHERE p.user_id = _user_id
      AND rp.permission = _permission
  )
$$;

-- get_user_permissions function
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY_AGG(DISTINCT rp.permission::text),
    ARRAY[]::text[]
  )
  FROM public.role_permissions rp
  JOIN public.profiles p ON p.role = rp.role_id
  WHERE p.user_id = _user_id
$$;
