-- Add column to store plant change type selection in checklists table
ALTER TABLE public.checklists 
ADD COLUMN plant_change_type text;

-- Add comment to document the column
COMMENT ON COLUMN public.checklists.plant_change_type IS 'Stores the type of plant change: "tie_in" for Project Advanced Tie-in scope or "moc" for Implementation of an approved Asset MOC';