
-- Fix existing SoF approvers for PSSR-BNGL-001: resolve actual people and set all to LOCKED

-- Plant Director -> Yesr Tamoul
UPDATE public.sof_approvers
SET approver_name = 'Yesr Tamoul',
    user_id = '83f6a3e5-82ea-4ae2-a38b-df3ca589bffa',
    status = 'LOCKED'
WHERE id = '0f84b15b-1bdd-4ccd-b5ec-351b56140f5f';

-- HSE Director -> Ali Danbous
UPDATE public.sof_approvers
SET approver_name = 'Ali Danbous',
    user_id = '52d07b04-bd60-4980-9f78-f2353b1bcbf9',
    status = 'LOCKED'
WHERE id = 'e6263c6b-c21e-4847-8bc4-5fa14b57c0e5';

-- P&M Director -> Paul Van Den Hemel
UPDATE public.sof_approvers
SET approver_name = 'Paul Van Den Hemel',
    user_id = '0dae95bb-6cdb-491d-ac4c-4c0cd7b2e8b2',
    status = 'LOCKED'
WHERE id = '8a7086d0-9ab9-4af6-b20d-9b3bcb95d4d2';
