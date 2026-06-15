
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_user uuid := 'ca6e0f7f-95f6-4a5f-8ee0-7c69b9647509';
  v_old_hash text;
BEGIN
  SELECT encrypted_password INTO v_old_hash FROM auth.users WHERE id = v_user;

  INSERT INTO public._email_rename_backup(user_id,table_name,column_name,row_pk,old_value,new_value,stage)
  VALUES (v_user,'auth.users','encrypted_password',v_user::text,v_old_hash,'[reset to temp test password]','A-pw-reset');

  UPDATE auth.users
     SET encrypted_password = extensions.crypt('OrshTest!2026', extensions.gen_salt('bf')),
         updated_at = now()
   WHERE id = v_user;
END $$;
