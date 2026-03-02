
-- System settings table for admin-configurable values
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  label text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings
CREATE POLICY "Authenticated users can read settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can insert settings"
  ON public.system_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()));

-- Seed default session timeout setting (30 minutes)
INSERT INTO public.system_settings (key, value, label, description, category)
VALUES (
  'session_timeout',
  '{"timeout_minutes": 30, "warning_minutes": 5, "enabled": true}'::jsonb,
  'Session Timeout',
  'Auto-logout users after a period of inactivity',
  'security'
);

-- Audit log when settings change
CREATE OR REPLACE FUNCTION public.audit_system_setting_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.value IS DISTINCT FROM NEW.value THEN
    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
    
    PERFORM write_audit_log(
      auth.uid(),
      'admin', 'setting_changed', 'warning',
      'system_setting', NEW.key, NEW.label,
      'System setting "' || NEW.label || '" changed',
      OLD.value,
      NEW.value
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_system_settings
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_system_setting_change();
