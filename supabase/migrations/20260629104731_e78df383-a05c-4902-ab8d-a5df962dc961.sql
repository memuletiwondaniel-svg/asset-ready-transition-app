
CREATE OR REPLACE FUNCTION public.get_my_vcr_item_tasks()
RETURNS TABLE (
  role text,
  project_id uuid,
  project_code text,
  project_title text,
  handover_point_id uuid,
  vcr_code text,
  vcr_name text,
  vcr_item_id uuid,
  prerequisite_id uuid,
  category_code text,
  category_name text,
  display_order integer,
  topic text,
  vcr_item text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      p.id                 AS prerequisite_id,
      p.vcr_item_id,
      p.handover_point_id,
      p.status::text       AS status,
      hp.vcr_code,
      hp.name              AS vcr_name,
      hpl.project_id,
      (pr.project_id_prefix || pr.project_id_number) AS project_code,
      pr.project_title,
      vi.topic,
      vi.vcr_item,
      vi.display_order,
      vi.approving_party_role_ids,
      c.code               AS category_code,
      c.name               AS category_name
    FROM public.p2a_vcr_prerequisites p
    JOIN public.p2a_handover_points hp ON hp.id = p.handover_point_id
    JOIN public.p2a_handover_plans hpl ON hpl.id = hp.handover_plan_id
    JOIN public.projects pr            ON pr.id = hpl.project_id
    JOIN public.vcr_items vi           ON vi.id = p.vcr_item_id
    JOIN public.vcr_item_categories c  ON c.id  = vi.category_id
    WHERE p.vcr_item_id IS NOT NULL
  )
  -- Delivering set: user is a delivering party AND status is actionable for them
  --   (mirrors canDeliver in VCRItemDetailSheet: not terminal, not READY_FOR_REVIEW).
  SELECT
    'delivering'::text     AS role,
    b.project_id, b.project_code, b.project_title,
    b.handover_point_id, b.vcr_code, b.vcr_name,
    b.vcr_item_id, b.prerequisite_id,
    b.category_code, b.category_name, b.display_order,
    b.topic, b.vcr_item, b.status
  FROM base b
  WHERE EXISTS (
    SELECT 1
    FROM public.vcr_item_delivering_parties dp
    WHERE dp.user_id = auth.uid()
      AND (
        dp.prerequisite_id = b.prerequisite_id
        OR (dp.vcr_item_id = b.vcr_item_id AND dp.handover_point_id = b.handover_point_id)
      )
  )
  AND b.status NOT IN ('ACCEPTED','QUALIFICATION_APPROVED','READY_FOR_REVIEW')

  UNION ALL

  -- Approving set: user is a project team member whose profile role is one of the
  --   item's approving roles AND status = READY_FOR_REVIEW (mirrors canApprove).
  SELECT
    'approving'::text     AS role,
    b.project_id, b.project_code, b.project_title,
    b.handover_point_id, b.vcr_code, b.vcr_name,
    b.vcr_item_id, b.prerequisite_id,
    b.category_code, b.category_name, b.display_order,
    b.topic, b.vcr_item, b.status
  FROM base b
  JOIN public.project_team_members ptm
    ON ptm.project_id = b.project_id AND ptm.user_id = auth.uid()
  JOIN public.profiles pf
    ON pf.user_id = auth.uid()
  WHERE b.status = 'READY_FOR_REVIEW'
    AND b.approving_party_role_ids IS NOT NULL
    AND pf.role = ANY (b.approving_party_role_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_my_vcr_item_tasks() TO authenticated;
