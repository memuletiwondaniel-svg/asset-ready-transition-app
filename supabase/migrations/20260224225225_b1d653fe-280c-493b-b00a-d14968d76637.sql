-- Rename column to reflect it now stores a role ID, not a user ID
ALTER TABLE public.pssr_reason_configuration 
  RENAME COLUMN default_pssr_lead_id TO default_pssr_lead_role_id;