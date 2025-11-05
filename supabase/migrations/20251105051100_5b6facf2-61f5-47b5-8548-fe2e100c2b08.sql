-- Add column to store selected tie-in scopes in checklists table
ALTER TABLE public.checklists 
ADD COLUMN selected_tie_in_scopes text[];

-- Add comment to document the column
COMMENT ON COLUMN public.checklists.selected_tie_in_scopes IS 'Array of selected tie-in scope codes when plant_change_type is tie_in';