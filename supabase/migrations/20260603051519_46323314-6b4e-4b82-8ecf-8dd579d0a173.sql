-- Label cleanup (revised after 23505): the 2 legacy 'Snr. ORA Engr.' rows
-- are pure duplicates — a canonical 'Sr ORA Engr' row already exists for
-- the same (project_id, user_id). Drop the drifted-label rows.
DELETE FROM public.project_team_members
WHERE role = 'Snr. ORA Engr.'
  AND EXISTS (
    SELECT 1
    FROM public.project_team_members ptm2
    WHERE ptm2.project_id = project_team_members.project_id
      AND ptm2.user_id    = project_team_members.user_id
      AND ptm2.role       = 'Sr ORA Engr'
  );