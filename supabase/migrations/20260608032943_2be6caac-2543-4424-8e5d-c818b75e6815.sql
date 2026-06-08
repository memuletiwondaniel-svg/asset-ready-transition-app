DO $$
DECLARE
  v_point_id    uuid := '96b44257-5c3b-4ec8-be04-1ada2d792257';
  v_handover_id uuid := '4bb9517f-2779-4414-b866-921230d56218';
  v_vcr_item_id uuid := 'f590a4f4-2ee7-4e4e-adbf-a62f2242eb66';
  r_comm   uuid := 'd88df696-db5f-4952-b685-1b907b472dcb';
  r_sora   uuid := 'c98aedd9-db4c-4322-b15e-824c86744acc';
BEGIN
  UPDATE public.p2a_vcr_prerequisites
     SET vcr_item_id = v_vcr_item_id, updated_at = now()
   WHERE handover_point_id = v_point_id AND vcr_item_id IS NULL;

  INSERT INTO public.p2a_vcr_item_overrides
    (handover_point_id, vcr_item_id, approving_party_role_ids_override, is_na)
  VALUES (v_point_id, v_vcr_item_id, ARRAY[r_comm, r_sora]::uuid[], false)
  ON CONFLICT (handover_point_id, vcr_item_id)
  DO UPDATE SET approving_party_role_ids_override = EXCLUDED.approving_party_role_ids_override,
                is_na = EXCLUDED.is_na,
                updated_at = now();

  INSERT INTO public.p2a_handover_approvers
    (handover_id, point_id, stage, cycle, role_name, display_order, status)
  SELECT v_handover_id, v_point_id, 'VCR', 1, x.role_name, x.display_order, 'PENDING'
    FROM (VALUES
      ('Construction Lead',   1),
      ('Commissioning Lead',  2),
      ('Project Hub Lead',    3),
      ('Dep. Plant Director', 4)
    ) AS x(role_name, display_order)
   WHERE NOT EXISTS (
     SELECT 1 FROM public.p2a_handover_approvers a
      WHERE a.handover_id = v_handover_id
        AND a.point_id    = v_point_id
        AND a.stage       = 'VCR'
        AND a.cycle       = 1
        AND a.role_name   = x.role_name
   );
END $$;