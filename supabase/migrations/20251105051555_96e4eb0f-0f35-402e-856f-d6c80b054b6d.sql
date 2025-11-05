-- Add columns to store MOC details in checklists table
ALTER TABLE public.checklists 
ADD COLUMN moc_number text,
ADD COLUMN selected_moc_scopes text[];

-- Add comments to document the columns
COMMENT ON COLUMN public.checklists.moc_number IS 'MOC number when plant_change_type is moc';
COMMENT ON COLUMN public.checklists.selected_moc_scopes IS 'Array of selected MOC scope names when plant_change_type is moc';