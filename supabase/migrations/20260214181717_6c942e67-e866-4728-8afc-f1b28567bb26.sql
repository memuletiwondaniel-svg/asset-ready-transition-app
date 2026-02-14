-- Fix approver assignments: correct user_id mapping
-- Victor Liew = Project Hub Lead (1)
-- Roaa Abdullah = ORA Lead (2)
-- Abel Maouche = CSU Lead (3)
-- Ali Zachi = Construction Lead (4)
-- Ewan McConnachie = Deputy Plant Director (5)

UPDATE public.p2a_handover_approvers 
SET user_id = '73734adc-61dd-4557-b613-84fe0ed2f49f', role_name = 'Project Hub Lead'
WHERE handover_id = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2' AND display_order = 1;

UPDATE public.p2a_handover_approvers 
SET user_id = '0c8134fd-7bde-491c-be5a-96b3a63c048c', role_name = 'ORA Lead'
WHERE handover_id = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2' AND display_order = 2;

UPDATE public.p2a_handover_approvers 
SET user_id = '3a4faa89-093a-4116-97ff-a08d14ee6a48', role_name = 'CSU Lead'
WHERE handover_id = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2' AND display_order = 3;

UPDATE public.p2a_handover_approvers 
SET user_id = '08fab8c4-9ac1-4646-a823-b62761fd1c58', role_name = 'Construction Lead'
WHERE handover_id = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2' AND display_order = 4;

-- Deputy Plant Director (Ewan) stays the same at display_order 5

-- Fix existing user_tasks: update the ones with wrong assignments
UPDATE public.user_tasks 
SET user_id = '73734adc-61dd-4557-b613-84fe0ed2f49f',
    description = 'You have been assigned as Project Hub Lead to review and approve the P2A Handover Plan for project DP-300.',
    metadata = jsonb_set(metadata, '{approver_role}', '"Project Hub Lead"')
WHERE metadata->>'plan_id' = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2' 
  AND user_id = '0c8134fd-7bde-491c-be5a-96b3a63c048c';

UPDATE public.user_tasks 
SET user_id = '0c8134fd-7bde-491c-be5a-96b3a63c048c',
    description = 'You have been assigned as ORA Lead to review and approve the P2A Handover Plan for project DP-300.',
    metadata = jsonb_set(metadata, '{approver_role}', '"ORA Lead"')
WHERE metadata->>'plan_id' = '7da85ab4-9ed7-402a-b137-ca0dfc8859c2' 
  AND user_id = '3a4faa89-093a-4116-97ff-a08d14ee6a48';

-- Create task for Abel (CSU Lead) - was previously unassigned
INSERT INTO public.user_tasks (user_id, title, description, type, priority, status, metadata)
VALUES (
  '3a4faa89-093a-4116-97ff-a08d14ee6a48',
  'Review & Approve P2A Handover Plan – DP-300',
  'You have been assigned as CSU Lead to review and approve the P2A Handover Plan for project DP-300.',
  'approval', 'High', 'pending',
  '{"plan_id": "7da85ab4-9ed7-402a-b137-ca0dfc8859c2", "project_id": "76901c6c-927d-4266-aaea-bc036888f274", "project_code": "DP-300", "approver_role": "CSU Lead", "approval_phase": 1, "source": "p2a_handover"}'::jsonb
);