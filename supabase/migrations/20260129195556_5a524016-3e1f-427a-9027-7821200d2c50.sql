-- Security Fix Migration: Address multiple security vulnerabilities
-- This migration addresses: profiles_sensitive_fields, security_definer_view, pssr_checklist_view

-- ============================================================
-- 1. CREATE SECURE PROFILES VIEW (excludes sensitive data)
-- ============================================================
-- This view provides safe access to profile data without exposing
-- sensitive fields like 2FA secrets, backup codes, and temporary passwords

DROP VIEW IF EXISTS public.profiles_safe CASCADE;

CREATE VIEW public.profiles_safe 
WITH (security_invoker = true)
AS SELECT 
    id,
    user_id,
    email,
    full_name,
    first_name,
    last_name,
    department,
    avatar_url,
    phone_number,
    primary_phone,
    secondary_phone,
    country_code,
    company,
    "position",
    plant,
    commission,
    hub,
    field,
    station,
    role,
    manager_id,
    is_active,
    status,
    account_status,
    sso_enabled,
    two_factor_enabled,
    functional_email,
    functional_email_address,
    last_login_at,
    created_at,
    updated_at,
    notification_preferences,
    preferences
FROM public.profiles;

COMMENT ON VIEW public.profiles_safe IS 'Safe view of profiles excluding sensitive auth data (2FA secrets, backup codes, temp passwords)';

-- ============================================================
-- 2. FIX projects_enriched VIEW (use SECURITY INVOKER)
-- ============================================================
-- Recreate the projects_enriched view with SECURITY INVOKER instead of SECURITY DEFINER
-- This ensures RLS policies of the querying user are enforced

DROP VIEW IF EXISTS public.projects_enriched CASCADE;

CREATE VIEW public.projects_enriched 
WITH (security_invoker = true)
AS SELECT 
    p.id,
    p.project_id_prefix,
    p.project_id_number,
    p.project_title,
    p.plant_id,
    p.station_id,
    p.project_scope,
    p.project_scope_image_url,
    p.hub_id,
    p.created_by,
    p.created_at,
    p.updated_at,
    p.is_active,
    p.region_id,
    p.is_favorite,
    pl.name AS plant_name,
    s.name AS station_name,
    h.name AS hub_name,
    COALESCE(tm.team_count, 0) AS team_count,
    tm.team_lead_user_id,
    pr.full_name AS team_lead_name,
    pr.avatar_url AS team_lead_avatar,
    COALESCE(ms.milestone_count, 0) AS milestone_count,
    COALESCE(ms.completed_milestone_count, 0) AS completed_milestone_count,
    ms.next_milestone_name,
    ms.next_milestone_date,
    COALESCE(ms.is_scorecard, false) AS is_scorecard,
    COALESCE(dc.document_count, 0) AS document_count
FROM projects p
LEFT JOIN plant pl ON p.plant_id = pl.id
LEFT JOIN station s ON p.station_id = s.id
LEFT JOIN hubs h ON p.hub_id = h.id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*)::integer AS team_count,
        (SELECT user_id FROM project_team_members ptm2 
         WHERE ptm2.project_id = p.id AND ptm2.is_lead = true LIMIT 1) AS team_lead_user_id
    FROM project_team_members
    WHERE project_team_members.project_id = p.id
) tm ON true
LEFT JOIN profiles pr ON pr.user_id = tm.team_lead_user_id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*)::integer AS milestone_count,
        COUNT(*) FILTER (WHERE status = 'Completed')::integer AS completed_milestone_count,
        (SELECT milestone_name FROM project_milestones pm2 
         WHERE pm2.project_id = p.id AND pm2.status <> 'Completed'
         ORDER BY milestone_date LIMIT 1) AS next_milestone_name,
        (SELECT milestone_date FROM project_milestones pm2 
         WHERE pm2.project_id = p.id AND pm2.status <> 'Completed'
         ORDER BY milestone_date LIMIT 1) AS next_milestone_date,
        bool_or(is_scorecard_project) AS is_scorecard
    FROM project_milestones
    WHERE project_milestones.project_id = p.id
) ms ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS document_count
    FROM project_documents
    WHERE project_documents.project_id = p.id
) dc ON true
WHERE p.is_active = true;

COMMENT ON VIEW public.projects_enriched IS 'Enriched projects view with team, milestone, and document counts (SECURITY INVOKER)';

-- ============================================================
-- 3. FIX pssr_checklist_items_ordered VIEW
-- ============================================================
-- Recreate with SECURITY INVOKER to enforce RLS of querying user

DROP VIEW IF EXISTS public.pssr_checklist_items_ordered CASCADE;

CREATE VIEW public.pssr_checklist_items_ordered 
WITH (security_invoker = true)
AS SELECT 
    id,
    category,
    topic,
    description,
    supporting_evidence,
    responsible,
    approvers,
    created_by,
    version,
    sequence_number,
    is_active,
    created_at,
    updated_at,
    updated_by
FROM public.pssr_checklist_items;

COMMENT ON VIEW public.pssr_checklist_items_ordered IS 'Ordered PSSR checklist items view (SECURITY INVOKER)';

-- ============================================================
-- 4. CREATE HELPER FUNCTION FOR SECURE PROFILE ACCESS
-- ============================================================
-- This function allows fetching only safe profile fields for any user
-- without exposing sensitive authentication data

CREATE OR REPLACE FUNCTION public.get_safe_profile_data(target_user_id uuid)
RETURNS TABLE(
    user_id uuid,
    full_name text,
    first_name text,
    last_name text,
    email text,
    avatar_url text,
    department text,
    user_position text,
    company user_company,
    phone_number text,
    is_active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.full_name,
        p.first_name,
        p.last_name,
        p.email,
        p.avatar_url,
        p.department,
        p."position" as user_position,
        p.company,
        p.phone_number,
        p.is_active
    FROM public.profiles p
    WHERE p.user_id = target_user_id;
END;
$$;

COMMENT ON FUNCTION public.get_safe_profile_data IS 'Returns only non-sensitive profile data for a user';

-- ============================================================
-- 5. CLEAR temporary_password VALUES (Security Risk)
-- ============================================================
-- Storing plaintext temporary passwords is a security risk
-- Supabase Auth handles password resets securely - clear any existing values

UPDATE public.profiles SET temporary_password = NULL WHERE temporary_password IS NOT NULL;