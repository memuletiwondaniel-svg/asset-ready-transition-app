
CREATE OR REPLACE FUNCTION public.admin_hard_delete_project(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _is_admin boolean;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT 'access_admin' = ANY(public.get_user_permissions(_user_id))
    INTO _is_admin;

  IF NOT COALESCE(_is_admin, false) THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  DELETE FROM project_milestones WHERE project_id = _project_id;
  DELETE FROM orp_plans WHERE project_id = _project_id;
  DELETE FROM project_documents WHERE project_id = _project_id;
  DELETE FROM p2a_handovers WHERE project_id = _project_id;
  DELETE FROM orm_plans WHERE project_id = _project_id;
  DELETE FROM project_team_members WHERE project_id = _project_id;
  DELETE FROM project_locations WHERE project_id = _project_id;
  DELETE FROM p2a_handover_plans WHERE project_id = _project_id;
  DELETE FROM outstanding_work_items WHERE project_id = _project_id;
  DELETE FROM readiness_dependencies WHERE project_id = _project_id;
  DELETE FROM readiness_nodes WHERE project_id = _project_id;
  DELETE FROM ori_scores WHERE project_id = _project_id;
  DELETE FROM stq_register WHERE project_id = _project_id;
  DELETE FROM moc_register WHERE project_id = _project_id;
  DELETE FROM override_register WHERE project_id = _project_id;
  DELETE FROM document_ingest_queue WHERE project_id = _project_id;
  DELETE FROM dms_external_sync WHERE project_id = _project_id;
  DELETE FROM document_packages WHERE project_id = _project_id;
  DELETE FROM document_po_structure WHERE project_id = _project_id;
  DELETE FROM dms_sync_logs WHERE project_id = _project_id;
  DELETE FROM mdr_register WHERE project_id = _project_id;
  DELETE FROM mdr_completeness_snapshots WHERE project_id = _project_id;
  DELETE FROM sdr_register WHERE project_id = _project_id;
  DELETE FROM sdr_completeness_snapshots WHERE project_id = _project_id;
  DELETE FROM dms_vendor_packages WHERE project_id = _project_id;
  DELETE FROM dms_reserved_numbers WHERE project_id = _project_id;
  DELETE FROM projects WHERE id = _project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_hard_delete_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_project(uuid) TO authenticated;
