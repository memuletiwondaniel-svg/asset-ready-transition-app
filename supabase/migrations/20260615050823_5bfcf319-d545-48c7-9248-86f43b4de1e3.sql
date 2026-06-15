
CREATE TABLE IF NOT EXISTS public._email_rename_backup (
  id           bigserial PRIMARY KEY,
  user_id      uuid,
  table_name   text NOT NULL,
  column_name  text NOT NULL,
  row_pk       text,
  old_value    text NOT NULL,
  new_value    text NOT NULL,
  stage        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public._email_rename_backup TO authenticated;
GRANT ALL ON public._email_rename_backup TO service_role;
ALTER TABLE public._email_rename_backup ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='_email_rename_backup' AND policyname='service_role_all') THEN
    EXECUTE 'CREATE POLICY service_role_all ON public._email_rename_backup FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

DO $$
DECLARE
  v_user uuid := 'ca6e0f7f-95f6-4a5f-8ee0-7c69b9647509';
  r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user AND email ~* '@basrahgas\.iq$') THEN
    RAISE EXCEPTION 'Stage A test user not found with a basrahgas.iq email';
  END IF;

  -- auth.users
  FOR r IN SELECT id, email FROM auth.users WHERE id = v_user AND email ~* '@basrahgas\.iq$' LOOP
    INSERT INTO public._email_rename_backup(user_id,table_name,column_name,row_pk,old_value,new_value,stage)
    VALUES (v_user,'auth.users','email',r.id::text,r.email,regexp_replace(r.email,'@basrahgas\.iq$','@gascompany.iq','i'),'A');
  END LOOP;
  UPDATE auth.users SET email = regexp_replace(email,'@basrahgas\.iq$','@gascompany.iq','i')
   WHERE id = v_user AND email ~* '@basrahgas\.iq$';

  -- auth.identities — write only identity_data; email column is GENERATED and recomputes
  FOR r IN SELECT id, identity_data FROM auth.identities
           WHERE user_id = v_user AND provider = 'email'
             AND (identity_data->>'email') ~* '@basrahgas\.iq$' LOOP
    INSERT INTO public._email_rename_backup(user_id,table_name,column_name,row_pk,old_value,new_value,stage)
    VALUES (v_user,'auth.identities','identity_data.email',r.id::text,(r.identity_data->>'email'),regexp_replace(r.identity_data->>'email','@basrahgas\.iq$','@gascompany.iq','i'),'A');
  END LOOP;
  UPDATE auth.identities
     SET identity_data = jsonb_set(identity_data,'{email}', to_jsonb(regexp_replace(identity_data->>'email','@basrahgas\.iq$','@gascompany.iq','i')))
   WHERE user_id = v_user AND provider = 'email'
     AND (identity_data->>'email') ~* '@basrahgas\.iq$';

  -- profiles
  FOR r IN SELECT id, email, functional_email_address, personal_email FROM public.profiles WHERE user_id = v_user LOOP
    IF r.email ~* '@basrahgas\.iq$' THEN
      INSERT INTO public._email_rename_backup(user_id,table_name,column_name,row_pk,old_value,new_value,stage)
      VALUES (v_user,'public.profiles','email',r.id::text,r.email,regexp_replace(r.email,'@basrahgas\.iq$','@gascompany.iq','i'),'A');
    END IF;
    IF r.functional_email_address ~* '@basrahgas\.iq$' THEN
      INSERT INTO public._email_rename_backup(user_id,table_name,column_name,row_pk,old_value,new_value,stage)
      VALUES (v_user,'public.profiles','functional_email_address',r.id::text,r.functional_email_address,regexp_replace(r.functional_email_address,'@basrahgas\.iq$','@gascompany.iq','i'),'A');
    END IF;
    IF r.personal_email ~* '@basrahgas\.iq$' THEN
      INSERT INTO public._email_rename_backup(user_id,table_name,column_name,row_pk,old_value,new_value,stage)
      VALUES (v_user,'public.profiles','personal_email',r.id::text,r.personal_email,regexp_replace(r.personal_email,'@basrahgas\.iq$','@gascompany.iq','i'),'A');
    END IF;
  END LOOP;
  UPDATE public.profiles
     SET email = CASE WHEN email ~* '@basrahgas\.iq$' THEN regexp_replace(email,'@basrahgas\.iq$','@gascompany.iq','i') ELSE email END,
         functional_email_address = CASE WHEN functional_email_address ~* '@basrahgas\.iq$' THEN regexp_replace(functional_email_address,'@basrahgas\.iq$','@gascompany.iq','i') ELSE functional_email_address END,
         personal_email = CASE WHEN personal_email ~* '@basrahgas\.iq$' THEN regexp_replace(personal_email,'@basrahgas\.iq$','@gascompany.iq','i') ELSE personal_email END
   WHERE user_id = v_user
     AND (email ~* '@basrahgas\.iq$' OR functional_email_address ~* '@basrahgas\.iq$' OR personal_email ~* '@basrahgas\.iq$');

  -- notifications.recipient_email
  FOR r IN SELECT id, recipient_email FROM public.notifications
           WHERE recipient_user_id = v_user AND recipient_email ~* '@basrahgas\.iq$' LOOP
    INSERT INTO public._email_rename_backup(user_id,table_name,column_name,row_pk,old_value,new_value,stage)
    VALUES (v_user,'public.notifications','recipient_email',r.id::text,r.recipient_email,regexp_replace(r.recipient_email,'@basrahgas\.iq$','@gascompany.iq','i'),'A');
  END LOOP;
  UPDATE public.notifications
     SET recipient_email = regexp_replace(recipient_email,'@basrahgas\.iq$','@gascompany.iq','i')
   WHERE recipient_user_id = v_user AND recipient_email ~* '@basrahgas\.iq$';
END $$;
