-- Create enum for user roles (if not exists)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
      'admin',
      'project_manager', 
      'commissioning_lead',
      'construction_lead',
      'technical_authority_ta2',
      'plant_director',
      'deputy_plant_director',
      'operations_coach',
      'ora_engineer',
      'site_engineer',
      'ops_hse_lead',
      'project_hse_lead',
      'er_lead',
      'production_director',
      'hse_director',
      'pe_director',
      'user',
      'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for TA2 disciplines
DO $$ BEGIN
    CREATE TYPE ta2_discipline AS ENUM ('Civil', 'Static', 'PACO', 'Process', 'Technical Safety');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for TA2 commissions
DO $$ BEGIN
    CREATE TYPE ta2_commission AS ENUM ('Asset', 'Project and Engineering');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for user privileges
DO $$ BEGIN
    CREATE TYPE user_privilege AS ENUM (
      'view_only',
      'complete_assigned_tasks',
      'edit_checklist_approvers',
      'edit_create_authenticate_user',
      'edit_create_project',
      'edit_create_master_checklist',
      'create_approve_operation_readiness',
      'create_approve_training_plan',
      'create_approve_pac',
      'create_approve_fac'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for user status
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending_approval', 'rejected', 'new');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update profiles table with additional fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS functional_email BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS personal_email TEXT,
ADD COLUMN IF NOT EXISTS primary_phone TEXT,
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+964',
ADD COLUMN IF NOT EXISTS ta2_discipline ta2_discipline,
ADD COLUMN IF NOT EXISTS ta2_commission ta2_commission,
ADD COLUMN IF NOT EXISTS authenticator_id UUID,
ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'pending_approval',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS temporary_password TEXT,
ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT TRUE;

-- Create user privileges junction table
CREATE TABLE IF NOT EXISTS public.user_privileges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  privilege user_privilege NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, privilege)
);

-- Create user projects junction table
CREATE TABLE IF NOT EXISTS public.user_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.user_privileges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_privileges
CREATE POLICY "Admins can manage all user privileges" 
ON public.user_privileges 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can view their own privileges" 
ON public.user_privileges 
FOR SELECT 
USING (auth.uid() = user_id);

-- RLS policies for user_projects
CREATE POLICY "Admins can manage all user projects" 
ON public.user_projects 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can view their own projects" 
ON public.user_projects 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to check if user has specific privilege
CREATE OR REPLACE FUNCTION public.user_has_privilege(user_uuid UUID, privilege_name user_privilege)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_privileges 
    WHERE user_id = user_uuid 
    AND privilege = privilege_name
  );
END;
$$;