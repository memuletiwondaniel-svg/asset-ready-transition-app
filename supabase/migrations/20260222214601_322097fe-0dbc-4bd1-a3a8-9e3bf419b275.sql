
ALTER TABLE public.pssrs
ADD COLUMN draft_pssr_approver_role_ids UUID[] DEFAULT NULL,
ADD COLUMN draft_sof_approver_role_ids UUID[] DEFAULT NULL;
