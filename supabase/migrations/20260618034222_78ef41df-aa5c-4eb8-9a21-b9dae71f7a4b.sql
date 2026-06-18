CREATE OR REPLACE FUNCTION public.move_task_to_column(p_task_id uuid, p_target_column text, p_force boolean DEFAULT false, p_void_reason text DEFAULT NULL::text, p_expected_status text DEFAULT NULL::text, p_is_protected boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_task user_tasks%ROWTYPE;
  v_meta jsonb;
  v_current_column text;
  v_new_task_status text;
  v_new_ora_status text;
  v_ora_activity_id_raw text;
  v_ora_activity_id uuid;
  v_is_p2a boolean;
  v_is_ora boolean;
  v_is_adhoc boolean;
  v_is_p2a_revert boolean;
  v_is_ora_revert boolean;
  v_is_adhoc_revert boolean;
  v_is_generic_revert boolean;
  v_project_id uuid;
  v_p2a_plan_id uuid;
  v_p2a_plan_status text;
  v_orp_plan_id uuid;
  v_orp_plan_status text;
  v_reverter_name text;
  v_next_cycle integer;
  v_task_reviewer_id uuid;
  v_source_task_id uuid;
  v_updated_meta jsonb;
  v_archive_count integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_target_column NOT IN ('todo','in_progress','waiting','done') THEN
    RAISE EXCEPTION 'Invalid target column: %', p_target_column;
  END IF;

  SELECT * INTO v_task FROM user_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result','skipped','reason','task_not_found');
  END IF;

  v_meta := COALESCE(v_task.metadata::jsonb, '{}'::jsonb);

  IF p_expected_status IS NOT NULL AND v_task.status IS DISTINCT FROM p_expected_status THEN
    RETURN jsonb_build_object('result','stale','current_status', v_task.status,'expected_status', p_expected_status);
  END IF;

  v_current_column := CASE v_task.status
    WHEN 'pending'      THEN 'todo'
    WHEN 'in_progress'  THEN 'in_progress'
    WHEN 'waiting'      THEN 'waiting'
    WHEN 'completed'    THEN 'done'
    WHEN 'done'         THEN 'done'
    ELSE NULL
  END;

  IF v_current_column = p_target_column THEN
    RETURN jsonb_build_object('result','skipped','reason','same_column');
  END IF;

  IF p_target_column = 'done' THEN
    RETURN jsonb_build_object('result','blocked','reason','target_done_requires_sheet');
  END IF;

  IF p_is_protected AND v_current_column = 'done' AND NOT p_force THEN
    RETURN jsonb_build_object('result','needs_warning','reason','approval_protected');
  END IF;

  v_ora_activity_id_raw := v_meta->>'ora_plan_activity_id';
  IF v_ora_activity_id_raw IS NOT NULL THEN
    IF v_ora_activity_id_raw LIKE 'ora-%' THEN
      v_ora_activity_id := substring(v_ora_activity_id_raw from 5)::uuid;
    ELSIF v_ora_activity_id_raw LIKE 'ws-%' THEN
      v_ora_activity_id := substring(v_ora_activity_id_raw from 4)::uuid;
    ELSE
      BEGIN
        v_ora_activity_id := v_ora_activity_id_raw::uuid;
      EXCEPTION WHEN others THEN v_ora_activity_id := NULL;
      END;
    END IF;
  END IF;

  v_is_p2a   := COALESCE((v_meta->>'action') = 'create_p2a_plan', false);
  v_is_ora   := COALESCE((v_meta->>'action') = 'create_ora_plan', false)
             OR COALESCE(v_task.type = 'ora_plan_creation', false);
  v_is_adhoc := COALESCE((v_meta->>'source') = 'task_review', false);

  v_is_p2a_revert    := v_is_p2a   AND v_current_column = 'done' AND p_target_column IN ('in_progress','todo');
  v_is_ora_revert    := v_is_ora   AND v_current_column = 'done' AND p_target_column IN ('in_progress','todo');
  v_is_adhoc_revert  := v_is_adhoc AND v_current_column = 'done' AND p_target_column IN ('in_progress','todo');
  v_is_generic_revert := (NOT v_is_p2a_revert) AND (NOT v_is_ora_revert) AND (NOT v_is_adhoc_revert)
                        AND v_current_column = 'done' AND p_target_column IN ('in_progress','todo');

  IF v_is_adhoc_revert OR v_is_ora_revert OR v_is_generic_revert THEN
    v_new_task_status := 'in_progress';
  ELSE
    v_new_task_status := CASE p_target_column
      WHEN 'todo' THEN 'pending'
      WHEN 'in_progress' THEN 'in_progress'
      WHEN 'waiting' THEN 'waiting'
      WHEN 'done' THEN 'completed'
    END;
  END IF;

  v_new_ora_status := CASE p_target_column
    WHEN 'todo' THEN 'NOT_STARTED'
    WHEN 'in_progress' THEN 'IN_PROGRESS'
    WHEN 'waiting' THEN 'NOT_STARTED'
    WHEN 'done' THEN 'COMPLETED'
  END;

  IF v_is_adhoc_revert IS NOT TRUE THEN
    UPDATE user_tasks
       SET status = v_new_task_status, updated_at = now()
     WHERE id = p_task_id;

    IF v_ora_activity_id IS NOT NULL THEN
      IF v_is_p2a_revert AND p_target_column = 'in_progress' THEN
        UPDATE ora_plan_activities
           SET status = v_new_ora_status, completion_percentage = 86
         WHERE id = v_ora_activity_id;
      ELSE
        UPDATE ora_plan_activities
           SET status = v_new_ora_status
         WHERE id = v_ora_activity_id;
      END IF;
    END IF;
  END IF;

  IF v_is_p2a_revert IS TRUE THEN
    BEGIN
      v_project_id := NULLIF(v_meta->>'project_id','')::uuid;
    EXCEPTION WHEN others THEN v_project_id := NULL;
    END;

    IF v_project_id IS NOT NULL THEN
      SELECT id, status INTO v_p2a_plan_id, v_p2a_plan_status
        FROM p2a_handover_plans
       WHERE project_id = v_project_id
       LIMIT 1;

      IF v_p2a_plan_id IS NOT NULL AND v_p2a_plan_status IN ('ACTIVE','COMPLETED','APPROVED') THEN
        SELECT COALESCE(full_name, '') INTO v_reverter_name
          FROM profiles WHERE user_id = v_user_id;
        IF v_reverter_name IS NULL OR v_reverter_name = '' THEN
          v_reverter_name := 'Unknown';
        END IF;

        UPDATE p2a_handover_plans
           SET status = 'DRAFT',
               updated_at = now(),
               last_rejection_comment = COALESCE(p_void_reason,'Reverted to Draft'),
               last_rejected_by_name = v_reverter_name,
               last_rejected_by_role = 'Reverted',
               last_rejected_at = now()
         WHERE id = v_p2a_plan_id;

        SELECT COALESCE(MAX(cycle),0) + 1 INTO v_next_cycle
          FROM p2a_approver_history WHERE handover_id = v_p2a_plan_id;

        WITH decided AS (
          SELECT id, user_id, role_name, display_order, status, approved_at, comments
            FROM p2a_handover_approvers
           WHERE handover_id = v_p2a_plan_id AND approved_at IS NOT NULL
        )
        INSERT INTO p2a_approver_history
          (handover_id, original_approver_id, user_id, role_name, display_order, status, approved_at, comments, cycle)
        SELECT v_p2a_plan_id, id, user_id, role_name, display_order, status, approved_at, comments, v_next_cycle
          FROM decided;

        GET DIAGNOSTICS v_archive_count = ROW_COUNT;

        SELECT COALESCE(MAX(cycle),1) INTO v_next_cycle
          FROM p2a_approver_history WHERE handover_id = v_p2a_plan_id;

        INSERT INTO p2a_approver_history
          (handover_id, user_id, role_name, status, comments, cycle, approved_at)
        VALUES
          (v_p2a_plan_id, v_user_id, 'Submitter', 'REVERTED', p_void_reason, v_next_cycle, now());

        UPDATE p2a_handover_approvers
           SET status = 'PENDING', approved_at = NULL, comments = NULL
         WHERE handover_id = v_p2a_plan_id;

        v_updated_meta := v_meta
          || jsonb_build_object('plan_status','DRAFT','completion_percentage',86);
        UPDATE user_tasks
           SET metadata = v_updated_meta
         WHERE id = p_task_id;

        IF v_ora_activity_id IS NOT NULL THEN
          UPDATE ora_plan_activities
             SET status = 'IN_PROGRESS', completion_percentage = 86
           WHERE id = v_ora_activity_id;
        END IF;

        -- FIX: P2A approver "Review & Approve" tasks are stored as
        -- type='approval' with metadata.source='p2a_handover' (not
        -- type='p2a_approval'). RESET them to actionable status instead of
        -- DELETE — auto_create_p2a_approval_task only fires on approver row
        -- INSERT, so re-submission (a status UPDATE) would not re-create
        -- them. Reset returns each task to its actionable column and
        -- preserves the task↔approver mapping; the auto_create dedup guard
        -- keeps re-submission duplicate-safe.
        UPDATE user_tasks
           SET status = CASE WHEN metadata->>'approval_phase' = '2' THEN 'waiting' ELSE 'pending' END,
               updated_at = now()
         WHERE type = 'approval'
           AND metadata->>'source' = 'p2a_handover'
           AND metadata->>'plan_id' = v_p2a_plan_id::text
           AND status NOT IN ('cancelled');

        SELECT id INTO v_orp_plan_id
          FROM orp_plans WHERE project_id = v_project_id LIMIT 1;

        IF v_orp_plan_id IS NOT NULL THEN
          DELETE FROM user_tasks
           WHERE type = 'vcr_delivery_plan'
             AND metadata->>'plan_id' = v_p2a_plan_id::text;

          DELETE FROM ora_plan_activities
           WHERE orp_plan_id = v_orp_plan_id
             AND source_type = 'vcr_delivery_plan';

          DELETE FROM ora_plan_activities
           WHERE orp_plan_id = v_orp_plan_id
             AND source_type = 'p2a_vcr';
        END IF;

        DELETE FROM ori_scores
         WHERE project_id = v_project_id
           AND snapshot_type = 'p2a_approval';

        DELETE FROM p2a_notifications
         WHERE handover_id = v_p2a_plan_id
           AND notification_type = 'p2a_plan_approved';
      END IF;
    END IF;
  END IF;

  IF v_is_ora_revert IS TRUE THEN
    BEGIN
      v_project_id := NULLIF(v_meta->>'project_id','')::uuid;
    EXCEPTION WHEN others THEN v_project_id := NULL;
    END;

    IF v_project_id IS NOT NULL THEN
      SELECT id, status INTO v_orp_plan_id, v_orp_plan_status
        FROM orp_plans WHERE project_id = v_project_id LIMIT 1;

      IF v_orp_plan_id IS NOT NULL AND v_orp_plan_status IN ('PENDING_APPROVAL','APPROVED','COMPLETED') THEN
        UPDATE orp_plans
           SET status = 'DRAFT', updated_at = now()
         WHERE id = v_orp_plan_id;

        SELECT COALESCE(MAX(cycle),0) + 1 INTO v_next_cycle
          FROM orp_approval_history WHERE orp_plan_id = v_orp_plan_id;

        WITH decided AS (
          SELECT id, approver_user_id, approver_role, status, approved_at, comments
            FROM orp_approvals
           WHERE orp_plan_id = v_orp_plan_id AND approved_at IS NOT NULL
        )
        INSERT INTO orp_approval_history
          (orp_plan_id, original_approval_id, user_id, role_name, status, approved_at, comments, cycle)
        SELECT v_orp_plan_id, id, approver_user_id, approver_role, status, approved_at, comments, v_next_cycle
          FROM decided;

        SELECT COALESCE(MAX(cycle),1) INTO v_next_cycle
          FROM orp_approval_history WHERE orp_plan_id = v_orp_plan_id;

        INSERT INTO orp_approval_history
          (orp_plan_id, user_id, role_name, status, comments, cycle, approved_at)
        VALUES
          (v_orp_plan_id, v_user_id, 'Submitter', 'REVERTED', p_void_reason, v_next_cycle, now());

        UPDATE orp_approvals
           SET status = 'PENDING', approved_at = NULL, comments = NULL
         WHERE orp_plan_id = v_orp_plan_id;

        v_updated_meta := v_meta
          || jsonb_build_object('plan_status','DRAFT','completion_percentage',83);
        UPDATE user_tasks
           SET metadata = v_updated_meta
         WHERE id = p_task_id;
      END IF;
    END IF;
  END IF;

  IF v_is_adhoc_revert IS TRUE THEN
    BEGIN
      v_task_reviewer_id := NULLIF(v_meta->>'task_reviewer_id','')::uuid;
    EXCEPTION WHEN others THEN v_task_reviewer_id := NULL;
    END;
    BEGIN
      v_source_task_id := NULLIF(v_meta->>'source_task_id','')::uuid;
    EXCEPTION WHEN others THEN v_source_task_id := NULL;
    END;

    IF v_task_reviewer_id IS NULL THEN
      RAISE EXCEPTION 'Missing reviewer assignment on task metadata';
    END IF;

    UPDATE task_reviewers
       SET status = 'PENDING', decided_at = NULL, comments = NULL
     WHERE id = v_task_reviewer_id AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Could not void reviewer decision';
    END IF;

    IF p_void_reason IS NOT NULL AND v_source_task_id IS NOT NULL THEN
      INSERT INTO task_comments (task_id, user_id, comment, comment_type)
      VALUES (v_source_task_id, v_user_id, '⚠️ Decision voided — ' || p_void_reason, 'reviewer_void');
    END IF;
  END IF;

  IF v_is_generic_revert IS TRUE AND p_void_reason IS NOT NULL THEN
    PERFORM public.reopen_task(p_task_id, p_void_reason, v_user_id);
  END IF;

  RETURN jsonb_build_object(
    'result','moved',
    'new_task_status', v_new_task_status,
    'new_ora_status', v_new_ora_status,
    'cascade', CASE
      WHEN v_is_p2a_revert IS TRUE THEN 'p2a_revert'
      WHEN v_is_ora_revert IS TRUE THEN 'ora_revert'
      WHEN v_is_adhoc_revert IS TRUE THEN 'adhoc_revert'
      WHEN v_is_generic_revert IS TRUE THEN 'generic_revert'
      ELSE 'standard'
    END
  );
END;
$function$;