-- Update Hub Lead positions to remove the portfolio/region from the title
-- e.g., "Project Hub Lead – Central – Zubair" → "Project Hub Lead – Zubair"

UPDATE public.profiles
SET position = 'Project Hub Lead – Zubair'
WHERE position = 'Project Hub Lead – Central – Zubair';

-- Update any other Hub Lead positions that might have the portfolio in the middle
UPDATE public.profiles
SET position = regexp_replace(position, 'Project Hub Lead – (North|Central|South) – ', 'Project Hub Lead – ')
WHERE position LIKE 'Project Hub Lead – %'
  AND position SIMILAR TO 'Project Hub Lead – (North|Central|South) – %';