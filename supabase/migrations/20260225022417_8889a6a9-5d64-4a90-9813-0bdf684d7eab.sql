-- Fix FK: default_pssr_lead_role_id should reference roles(id), not profiles(user_id)
ALTER TABLE public.pssr_reason_configuration
  DROP CONSTRAINT pssr_reason_configuration_default_pssr_lead_id_fkey;

ALTER TABLE public.pssr_reason_configuration
  ADD CONSTRAINT pssr_reason_configuration_default_pssr_lead_role_id_fkey
  FOREIGN KEY (default_pssr_lead_role_id) REFERENCES public.roles(id);