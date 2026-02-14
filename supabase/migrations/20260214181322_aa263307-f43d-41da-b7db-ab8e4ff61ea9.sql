-- Fix the FK on p2a_handover_approvers to reference p2a_handover_plans instead of p2a_handovers
ALTER TABLE public.p2a_handover_approvers DROP CONSTRAINT IF EXISTS p2a_handover_approvers_handover_id_fkey;

ALTER TABLE public.p2a_handover_approvers 
  ADD CONSTRAINT p2a_handover_approvers_handover_id_fkey 
  FOREIGN KEY (handover_id) REFERENCES public.p2a_handover_plans(id) ON DELETE CASCADE;

-- Now insert the approvers for the active plan
INSERT INTO public.p2a_handover_approvers (handover_id, role_name, user_id, display_order, status)
VALUES 
  ('7da85ab4-9ed7-402a-b137-ca0dfc8859c2', 'Project Hub Lead', '0c8134fd-7bde-491c-be5a-96b3a63c048c', 1, 'PENDING'),
  ('7da85ab4-9ed7-402a-b137-ca0dfc8859c2', 'ORA Lead', '3a4faa89-093a-4116-97ff-a08d14ee6a48', 2, 'PENDING'),
  ('7da85ab4-9ed7-402a-b137-ca0dfc8859c2', 'CSU Lead', NULL, 3, 'PENDING'),
  ('7da85ab4-9ed7-402a-b137-ca0dfc8859c2', 'Construction Lead', '73734adc-61dd-4557-b613-84fe0ed2f49f', 4, 'PENDING'),
  ('7da85ab4-9ed7-402a-b137-ca0dfc8859c2', 'Deputy Plant Director', '9358a12a-0c7c-44c7-a536-bb523c2e2829', 5, 'PENDING')
ON CONFLICT DO NOTHING;