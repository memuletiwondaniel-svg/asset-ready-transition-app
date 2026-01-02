-- Create a view with columns in the preferred order for admin visibility
CREATE OR REPLACE VIEW public.pssr_checklist_items_ordered AS
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