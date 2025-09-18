-- Clear all entries from Approver and responsible columns in checklist_items table
UPDATE public.checklist_items 
SET 
  "Approver" = NULL,
  responsible = NULL;