
-- Backfill approving_role and delivering_role on all existing responses from their checklist items
UPDATE public.pssr_checklist_responses r
SET 
  approving_role = ci.approvers,
  delivering_role = ci.responsible
FROM public.pssr_checklist_items ci
WHERE r.checklist_item_id = ci.id::text
  AND (r.approving_role IS NULL OR r.delivering_role IS NULL);
