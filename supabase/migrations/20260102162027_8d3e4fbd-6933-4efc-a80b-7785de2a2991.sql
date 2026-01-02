-- Rename "Prod Director" role to "P&M Director"
UPDATE public.roles 
SET name = 'P&M Director', updated_at = now()
WHERE name = 'Prod Director';