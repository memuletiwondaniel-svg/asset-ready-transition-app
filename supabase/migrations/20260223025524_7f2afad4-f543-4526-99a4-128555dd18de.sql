
-- Delete duplicate pssr_approvers, keeping only the one with the earliest created_at per (pssr_id, approver_role, approver_level)
DELETE FROM public.pssr_approvers a
USING public.pssr_approvers b
WHERE a.pssr_id = b.pssr_id
  AND a.approver_role = b.approver_role
  AND a.approver_level = b.approver_level
  AND a.id::text > b.id::text;

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.pssr_approvers
ADD CONSTRAINT pssr_approvers_unique_role_per_pssr UNIQUE (pssr_id, approver_role, approver_level);
