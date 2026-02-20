
ALTER TABLE public.pssr_reason_configuration
ADD COLUMN default_pssr_lead_id UUID REFERENCES public.profiles(user_id);

COMMENT ON COLUMN public.pssr_reason_configuration.default_pssr_lead_id IS 'Default PSSR Lead user for this template';
