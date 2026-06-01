-- Rename the canonical Sr ORA Engineer role to match the literal used by
-- production triggers and the harness. resolve_project_role_user JOINs
-- project_team_members.role = roles.name; the catalog drift
-- ('Snr. ORA Engr.' vs 'Sr ORA Engr') was returning NULL from the resolver
-- and silently suppressing the leaf-task trigger (R5).
--
-- Order matters: move the text-key data on project_team_members FIRST so the
-- resolver continues to find existing teams the instant roles.name flips.
-- profiles.role is a FK to roles.id and tracks the rename automatically.
-- orp_approvals.approver_role and user_tasks.metadata->>approver_role have
-- 0 rows referencing the old label (verified pre-migration); no data sync
-- needed for those.

UPDATE public.project_team_members
   SET role = 'Sr ORA Engr'
 WHERE role = 'Snr. ORA Engr.';

UPDATE public.roles
   SET name = 'Sr ORA Engr'
 WHERE code = 'SNR_ORA_ENGR';