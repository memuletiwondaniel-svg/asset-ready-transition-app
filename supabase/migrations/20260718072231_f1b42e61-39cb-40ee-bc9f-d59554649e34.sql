
UPDATE public.qaqc_checks
   SET sql = $q$
     SELECT p.id
       FROM public.p2a_vcr_prerequisites p
       JOIN public.vcr_items vi ON vi.id = p.vcr_item_id
       JOIN public.p2a_handover_points hp ON hp.id = p.handover_point_id
       JOIN public.p2a_handover_plans hp_plan ON hp_plan.id = hp.handover_plan_id
      WHERE p.status = 'QUALIFICATION_REQUESTED'
        AND EXISTS (
          SELECT 1 FROM unnest(vi.approving_party_role_ids) rid
          JOIN public.roles r ON r.id = rid
          CROSS JOIN LATERAL public.resolve_project_role_users(hp_plan.project_id, r.name) u
          WHERE u IS NOT NULL)
        AND NOT EXISTS (
          SELECT 1 FROM public.user_tasks t
           WHERE t.type='qualification_review' AND t.source_plan_id=p.id
             AND t.status IN ('pending','in_progress','waiting'))
   $q$,
       description = 'Every prereq in QUALIFICATION_REQUESTED that has resolvable role holders must have >=1 open qualification_review task.'
 WHERE title = 'T7_qualification_requested_has_open_review_task';
