
-- Single-source the delivering/approving party resolution to the SAME
-- effective (per-handover-point) role the drawer CTA uses:
-- COALESCE(p2a_vcr_item_overrides.*_override, vcr_items.*).

CREATE OR REPLACE FUNCTION public.is_vcr_item_delivering_party(
  _user_id uuid, _vcr_item_id uuid, _handover_point_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    -- 1. Explicit junction override (per-user allow-list)
    EXISTS (
      SELECT 1 FROM public.vcr_item_delivering_parties
      WHERE user_id = _user_id
        AND vcr_item_id = _vcr_item_id
        AND handover_point_id = _handover_point_id
    )
    -- 2. Effective delivering role for THIS (item, handover point):
    --    override.delivering_party_role_id_override, else vcr_items.delivering_party_role_id
    OR EXISTS (
      SELECT 1
      FROM public.vcr_items vi
      JOIN public.p2a_handover_points hp ON hp.id = _handover_point_id
      JOIN public.p2a_handover_plans hpl ON hpl.id = hp.handover_plan_id
      LEFT JOIN public.p2a_vcr_item_overrides ov
        ON ov.vcr_item_id = vi.id
       AND ov.handover_point_id = _handover_point_id
      CROSS JOIN LATERAL (
        SELECT COALESCE(ov.delivering_party_role_id_override, vi.delivering_party_role_id) AS eff_role_id
      ) e
      JOIN public.roles r ON r.id = e.eff_role_id
      WHERE vi.id = _vcr_item_id
        AND e.eff_role_id IS NOT NULL
        AND public.resolve_project_role_user(hpl.project_id, r.name) = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_vcr_item_approving_party(
  _user_id uuid, _vcr_item_id uuid, _handover_point_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vcr_items vi
    JOIN public.p2a_handover_points hp ON hp.id = _handover_point_id
    JOIN public.p2a_handover_plans hpl ON hpl.id = hp.handover_plan_id
    LEFT JOIN public.p2a_vcr_item_overrides ov
      ON ov.vcr_item_id = vi.id
     AND ov.handover_point_id = _handover_point_id
    CROSS JOIN LATERAL (
      SELECT COALESCE(ov.approving_party_role_ids_override, vi.approving_party_role_ids, ARRAY[]::uuid[]) AS eff_role_ids
    ) e
    CROSS JOIN LATERAL unnest(e.eff_role_ids) AS role_uuid
    JOIN public.roles r ON r.id = role_uuid
    WHERE vi.id = _vcr_item_id
      AND public.resolve_project_role_user(hpl.project_id, r.name) = _user_id
  );
$$;

-- is_vcr_item_party and is_p2a_vcr_evidence_party are unchanged; they
-- delegate to the two helpers above so evidence + comments now share
-- the exact same effective-role resolution.
