BEGIN;

-- Backup
INSERT INTO public._email_rename_backup (stage, table_name, row_pk, column_name, old_value, new_value)
SELECT 'FIX-ANUARBEK', 'auth.identities', i.id::text, 'identity_data.email',
       i.identity_data->>'email', 'anuarbek.bagytzhan@epcmcompany.com'
FROM auth.identities i
WHERE i.user_id='49d052ff-e30f-4b1f-b10b-7edeb83db97e'
  AND i.provider='email'
  AND i.identity_data->>'email' ~* '^bagytzhan\.anuarbek@epcmcompany\.com$';

-- Fix
UPDATE auth.identities
SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb('anuarbek.bagytzhan@epcmcompany.com'::text), false)
WHERE user_id='49d052ff-e30f-4b1f-b10b-7edeb83db97e'
  AND provider='email'
  AND identity_data->>'email' ~* '^bagytzhan\.anuarbek@epcmcompany\.com$';

-- Guard: ensure auth.users and identities now agree
DO $$
DECLARE u text; i text;
BEGIN
  SELECT email INTO u FROM auth.users WHERE id='49d052ff-e30f-4b1f-b10b-7edeb83db97e';
  SELECT identity_data->>'email' INTO i FROM auth.identities WHERE user_id='49d052ff-e30f-4b1f-b10b-7edeb83db97e' AND provider='email';
  IF lower(u) <> lower(i) THEN
    RAISE EXCEPTION 'Desync remains: users=% identities=%', u, i;
  END IF;
END $$;

COMMIT;