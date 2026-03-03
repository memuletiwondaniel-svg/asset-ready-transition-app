
DO $$
DECLARE
  v_pssr RECORD;
  v_item RECORD;
  v_user_id UUID;
  v_sub_items JSONB;
BEGIN
  FOR v_pssr IN 
    SELECT p.id, p.pssr_id, p.project_name FROM pssrs p WHERE p.status = 'UNDER_REVIEW'
  LOOP
    -- Delivering bundles
    FOR v_item IN
      SELECT DISTINCT cr.delivering_role FROM pssr_checklist_responses cr
      WHERE cr.pssr_id = v_pssr.id AND cr.delivering_role IS NOT NULL AND cr.delivering_role != ''
    LOOP
      SELECT pr.user_id INTO v_user_id FROM profiles pr
      WHERE pr.position ILIKE v_item.delivering_role || '%' AND pr.is_active = true LIMIT 1;

      IF v_user_id IS NOT NULL THEN
        SELECT jsonb_agg(jsonb_build_object(
          'checklist_response_id', cr.id, 'checklist_item_id', cr.checklist_item_id,
          'summary', COALESCE(ci.description, 'Item'), 'completed', (cr.status = 'APPROVED')
        )) INTO v_sub_items
        FROM pssr_checklist_responses cr
        LEFT JOIN pssr_checklist_items ci ON ci.id::text = cr.checklist_item_id::text
        WHERE cr.pssr_id = v_pssr.id AND cr.delivering_role = v_item.delivering_role;

        INSERT INTO user_tasks (user_id, title, description, type, status, priority, sub_items, metadata, progress_percentage)
        VALUES (v_user_id, v_pssr.pssr_id || ' - Deliver Checklist Items',
          'Complete your assigned checklist items for ' || v_pssr.pssr_id,
          'pssr_checklist_bundle', 'pending', 'High', COALESCE(v_sub_items, '[]'::jsonb),
          jsonb_build_object('pssr_id', v_pssr.id, 'pssr_code', v_pssr.pssr_id,
            'project_name', v_pssr.project_name, 'delivering_role', v_item.delivering_role), 0);
      END IF;
    END LOOP;

    -- Approving bundles
    FOR v_item IN
      SELECT DISTINCT cr.approving_role FROM pssr_checklist_responses cr
      WHERE cr.pssr_id = v_pssr.id AND cr.approving_role IS NOT NULL AND cr.approving_role != ''
    LOOP
      SELECT pr.user_id INTO v_user_id FROM profiles pr
      WHERE pr.position ILIKE v_item.approving_role || '%' AND pr.is_active = true LIMIT 1;

      IF v_user_id IS NOT NULL THEN
        SELECT jsonb_agg(jsonb_build_object(
          'checklist_response_id', cr.id, 'checklist_item_id', cr.checklist_item_id,
          'summary', COALESCE(ci.description, 'Item'), 'completed', (cr.status = 'APPROVED')
        )) INTO v_sub_items
        FROM pssr_checklist_responses cr
        LEFT JOIN pssr_checklist_items ci ON ci.id::text = cr.checklist_item_id::text
        WHERE cr.pssr_id = v_pssr.id AND cr.approving_role = v_item.approving_role;

        INSERT INTO user_tasks (user_id, title, description, type, status, priority, sub_items, metadata, progress_percentage)
        VALUES (v_user_id, v_pssr.pssr_id || ' - Review Checklist Items',
          'Review and approve checklist items for ' || v_pssr.pssr_id,
          'pssr_approval_bundle', 'waiting', 'Medium', COALESCE(v_sub_items, '[]'::jsonb),
          jsonb_build_object('pssr_id', v_pssr.id, 'pssr_code', v_pssr.pssr_id,
            'project_name', v_pssr.project_name, 'approving_role', v_item.approving_role), 0);
      END IF;
    END LOOP;
  END LOOP;
END $$;
