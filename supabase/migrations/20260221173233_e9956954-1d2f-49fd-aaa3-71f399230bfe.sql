-- Fix PSSR-BNGL-001 approvers: Engr. Manager -> Harald Traa (Asset)
UPDATE public.pssr_approvers
SET user_id = 'd67fa587-17d3-48ba-931c-2521824ea408',
    approver_name = 'Harald Traa'
WHERE id = '780e15c3-f72c-478c-906e-c058febc61e2';

-- Dep. Plant Director -> Craig Forbes (BNGL)
UPDATE public.pssr_approvers
SET user_id = '254be617-d8c0-4f21-a555-88629a5a121c',
    approver_name = 'Craig Forbes'
WHERE id = 'f61042fa-8c91-44c1-a699-4c35279d071a';

-- Central Mtce Lead -> Dean Nye
UPDATE public.pssr_approvers
SET user_id = 'b088f1f6-aee4-45fa-9cea-febdfbbe4249',
    approver_name = 'Dean Nye'
WHERE id = '6a311853-a1dc-4423-86b4-70ba439545d4';