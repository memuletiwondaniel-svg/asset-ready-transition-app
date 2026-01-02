-- Drop and recreate view with SECURITY INVOKER (uses querying user's permissions)
DROP VIEW IF EXISTS public.pssr_checklist_items_ordered;

CREATE VIEW public.pssr_checklist_items_ordered 
WITH (security_invoker = true) AS
SELECT 
  id,
  category,
  topic,
  description,
  supporting_evidence,
  responsible,
  approvers,
  created_by,
  version,
  sequence_number,
  is_active,
  created_at,
  updated_at,
  updated_by
FROM public.pssr_checklist_items;