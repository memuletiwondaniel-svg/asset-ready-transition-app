
-- TEST harness step 1: create throwaway plan on DP-385 and submit to PENDING_APPROVAL.
INSERT INTO public.p2a_handover_plans (id, name, status, project_id, project_code, plant_code, tenant_id, created_by)
VALUES ('11111111-1111-1111-1111-111111111111', '[TEST] Throwaway P2A fanout verification', 'DRAFT',
  '77b0cda9-c945-4adf-823f-52222cda70c6', 'DP-385', 'CS',
  '63c14b6f-66d9-4963-bcd2-287662d538e2', NULL);

UPDATE public.p2a_handover_plans SET status = 'PENDING_APPROVAL' WHERE id = '11111111-1111-1111-1111-111111111111';
