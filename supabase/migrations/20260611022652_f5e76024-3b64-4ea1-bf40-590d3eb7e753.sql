-- A portfolio role is held for exactly ONE region at a time per user.
-- region_role_holders is used only for region-scoped roles, so a plain
-- UNIQUE(user_id, role_id) is the right enforcement.
ALTER TABLE public.region_role_holders
  DROP CONSTRAINT IF EXISTS region_role_holders_user_role_unique;

ALTER TABLE public.region_role_holders
  ADD CONSTRAINT region_role_holders_user_role_unique
  UNIQUE (user_id, role_id);