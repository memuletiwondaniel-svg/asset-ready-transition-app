
-- Disable only the user-defined audit trigger
ALTER TABLE public.p2a_handovers DISABLE TRIGGER audit_p2a_handovers;

-- Create BGC tenant and backfill
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name, slug)
  VALUES ('Basrah Gas Company', 'bgc')
  ON CONFLICT (slug) DO UPDATE SET name = 'Basrah Gas Company'
  RETURNING id INTO v_tenant_id;

  UPDATE public.profiles SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.projects SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.pssrs SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.orp_plans SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.orm_plans SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.p2a_handover_plans SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.p2a_handovers SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.user_tasks SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.chat_conversations SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.notification_preferences SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.project_team_members SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
END $$;

-- Re-enable the trigger
ALTER TABLE public.p2a_handovers ENABLE TRIGGER audit_p2a_handovers;
