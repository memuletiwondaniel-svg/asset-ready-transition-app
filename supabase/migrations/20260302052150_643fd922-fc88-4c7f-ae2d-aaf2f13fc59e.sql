
-- Add brute-force protection settings
INSERT INTO public.system_settings (key, value, label, description, category)
VALUES (
  'brute_force_protection',
  '{"enabled": true, "max_attempts": 5, "lockout_minutes": 30, "progressive_lockout": true}'::jsonb,
  'Brute-Force Protection',
  'Lock accounts after repeated failed login attempts',
  'security'
);

-- Upgrade track_failed_login to read config from system_settings
CREATE OR REPLACE FUNCTION public.track_failed_login(user_uuid uuid, ip_addr text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_attempts integer;
  v_config jsonb;
  v_max_attempts integer;
  v_lockout_minutes integer;
  v_progressive boolean;
  v_lock_duration interval;
  v_locked_until timestamptz;
BEGIN
  -- Read brute-force config
  SELECT value INTO v_config
  FROM public.system_settings
  WHERE key = 'brute_force_protection';

  v_max_attempts := COALESCE((v_config->>'max_attempts')::int, 5);
  v_lockout_minutes := COALESCE((v_config->>'lockout_minutes')::int, 30);
  v_progressive := COALESCE((v_config->>'progressive_lockout')::boolean, true);

  -- Increment login attempts
  UPDATE public.profiles
  SET login_attempts = login_attempts + 1
  WHERE user_id = user_uuid
  RETURNING login_attempts INTO current_attempts;

  -- Calculate lock duration (progressive: doubles each time past threshold)
  IF current_attempts >= v_max_attempts THEN
    IF v_progressive AND current_attempts > v_max_attempts THEN
      -- Double lockout for each additional failed attempt beyond max
      v_lock_duration := (v_lockout_minutes * POWER(2, LEAST(current_attempts - v_max_attempts, 4)))::int * interval '1 minute';
    ELSE
      v_lock_duration := v_lockout_minutes * interval '1 minute';
    END IF;

    v_locked_until := now() + v_lock_duration;

    UPDATE public.profiles
    SET locked_until = v_locked_until
    WHERE user_id = user_uuid;
  END IF;

  -- Log the failed attempt
  INSERT INTO public.user_activity_logs (user_id, activity_type, description, ip_address, metadata)
  VALUES (
    user_uuid,
    'failed_login',
    'Failed login attempt (' || current_attempts || '/' || v_max_attempts || ')',
    ip_addr,
    jsonb_build_object(
      'attempt_number', current_attempts,
      'max_attempts', v_max_attempts,
      'locked', current_attempts >= v_max_attempts,
      'locked_until', v_locked_until
    )
  );

  -- Audit log
  PERFORM write_audit_log(
    user_uuid,
    'auth', 'login_failed',
    CASE WHEN current_attempts >= v_max_attempts THEN 'critical' ELSE 'warning' END,
    'user', user_uuid::text, NULL,
    CASE
      WHEN current_attempts >= v_max_attempts
      THEN 'Account locked after ' || current_attempts || ' failed attempts. Locked until ' || v_locked_until::text
      ELSE 'Failed login attempt ' || current_attempts || '/' || v_max_attempts
    END,
    NULL,
    jsonb_build_object('attempt_number', current_attempts, 'locked', current_attempts >= v_max_attempts)
  );

  RETURN jsonb_build_object(
    'attempts', current_attempts,
    'max_attempts', v_max_attempts,
    'locked', current_attempts >= v_max_attempts,
    'locked_until', v_locked_until,
    'remaining', GREATEST(v_max_attempts - current_attempts, 0)
  );
END;
$$;

-- Function to check if an account is locked (callable before sign-in)
CREATE OR REPLACE FUNCTION public.check_account_lockout(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked_until timestamptz;
  v_attempts integer;
  v_config jsonb;
  v_max_attempts integer;
  v_enabled boolean;
BEGIN
  -- Read config
  SELECT value INTO v_config
  FROM public.system_settings
  WHERE key = 'brute_force_protection';

  v_enabled := COALESCE((v_config->>'enabled')::boolean, true);
  v_max_attempts := COALESCE((v_config->>'max_attempts')::int, 5);

  IF NOT v_enabled THEN
    RETURN jsonb_build_object('locked', false, 'enabled', false);
  END IF;

  SELECT locked_until, login_attempts
  INTO v_locked_until, v_attempts
  FROM public.profiles
  WHERE email = user_email;

  -- No profile found = not locked
  IF v_locked_until IS NULL THEN
    RETURN jsonb_build_object(
      'locked', false,
      'attempts', COALESCE(v_attempts, 0),
      'max_attempts', v_max_attempts,
      'remaining', GREATEST(v_max_attempts - COALESCE(v_attempts, 0), 0)
    );
  END IF;

  -- Check if lock has expired
  IF v_locked_until <= now() THEN
    -- Auto-unlock
    UPDATE public.profiles
    SET locked_until = NULL, login_attempts = 0
    WHERE email = user_email;

    RETURN jsonb_build_object(
      'locked', false,
      'attempts', 0,
      'max_attempts', v_max_attempts,
      'remaining', v_max_attempts
    );
  END IF;

  -- Account is locked
  RETURN jsonb_build_object(
    'locked', true,
    'locked_until', v_locked_until,
    'attempts', v_attempts,
    'max_attempts', v_max_attempts,
    'remaining_seconds', EXTRACT(EPOCH FROM (v_locked_until - now()))::int
  );
END;
$$;
