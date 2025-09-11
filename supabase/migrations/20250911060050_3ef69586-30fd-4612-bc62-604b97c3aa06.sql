-- Update the enhanced user management function to include the role field from profiles
CREATE OR REPLACE FUNCTION public.get_enhanced_user_management_data()
 RETURNS TABLE(user_id uuid, email text, full_name text, first_name text, last_name text, company user_company, employee_id text, job_title text, department text, phone_number text, account_status text, status user_status, last_login_at timestamp with time zone, created_at timestamp with time zone, sso_enabled boolean, two_factor_enabled boolean, role text, roles text[], projects text[], manager_name text, pending_actions integer, login_attempts integer, locked_until timestamp with time zone, password_change_required boolean, last_activity timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.company,
    p.employee_id,
    p.job_title,
    p.department,
    p.phone_number,
    p.account_status,
    p.status,
    p.last_login_at,
    p.created_at,
    p.sso_enabled,
    p.two_factor_enabled,
    p.role,
    COALESCE(ARRAY_AGG(DISTINCT ur.role::TEXT) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::TEXT[]) as roles,
    COALESCE(ARRAY_AGG(DISTINCT up.project_name) FILTER (WHERE up.project_name IS NOT NULL), ARRAY[]::TEXT[]) as projects,
    manager.full_name as manager_name,
    COALESCE(COUNT(DISTINCT pcr.id) FILTER (WHERE pcr.status = 'NOT_SUBMITTED'), 0)::integer as pending_actions,
    p.login_attempts,
    p.locked_until,
    p.password_change_required,
    us.last_activity
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  LEFT JOIN public.user_projects up ON p.user_id = up.user_id
  LEFT JOIN public.profiles manager ON p.manager_id = manager.user_id
  LEFT JOIN public.pssrs pssr ON pssr.user_id = p.user_id
  LEFT JOIN public.pssr_checklist_responses pcr ON pcr.pssr_id = pssr.id
  LEFT JOIN public.user_sessions us ON us.user_id = p.user_id AND us.is_active = true
  GROUP BY 
    p.user_id, p.email, p.full_name, p.first_name, p.last_name, p.company, 
    p.employee_id, p.job_title, p.department, p.phone_number, p.account_status, 
    p.status, p.last_login_at, p.created_at, p.sso_enabled, p.two_factor_enabled,
    p.role, p.login_attempts, p.locked_until, p.password_change_required,
    manager.full_name, us.last_activity;
END;
$function$;