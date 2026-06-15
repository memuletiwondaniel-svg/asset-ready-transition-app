
BEGIN;

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B2','auth.users','email', id::text, id, email,
       regexp_replace(email, '@kentplc\.com$', '@epcmcompany.com', 'i')
FROM auth.users WHERE email ~* '@kentplc\.com$';

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B2','auth.identities','identity_data.email', id::text, user_id,
       identity_data->>'email',
       regexp_replace(identity_data->>'email', '@kentplc\.com$', '@epcmcompany.com', 'i')
FROM auth.identities
WHERE provider='email' AND identity_data->>'email' ~* '@kentplc\.com$';

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B2','profiles','email', id::text, id, email,
       regexp_replace(email, '@kentplc\.com$', '@epcmcompany.com', 'i')
FROM public.profiles WHERE email ~* '@kentplc\.com$';

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B2','profiles','functional_email_address', id::text, id, functional_email_address,
       regexp_replace(functional_email_address, '@kentplc\.com$', '@epcmcompany.com', 'i')
FROM public.profiles WHERE functional_email_address ~* '@kentplc\.com$';

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B2','profiles','personal_email', id::text, id, personal_email,
       regexp_replace(personal_email, '@kentplc\.com$', '@epcmcompany.com', 'i')
FROM public.profiles WHERE personal_email ~* '@kentplc\.com$';

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B2','notifications','recipient_email', id::text, recipient_user_id, recipient_email,
       regexp_replace(recipient_email, '@kentplc\.com$', '@epcmcompany.com', 'i')
FROM public.notifications WHERE recipient_email ~* '@kentplc\.com$';

UPDATE auth.users
   SET email = regexp_replace(email, '@kentplc\.com$', '@epcmcompany.com', 'i')
 WHERE email ~* '@kentplc\.com$';

UPDATE auth.identities
   SET identity_data = jsonb_set(identity_data, '{email}',
        to_jsonb(regexp_replace(identity_data->>'email', '@kentplc\.com$', '@epcmcompany.com', 'i')))
 WHERE provider='email' AND identity_data->>'email' ~* '@kentplc\.com$';

UPDATE public.profiles
   SET email = regexp_replace(email, '@kentplc\.com$', '@epcmcompany.com', 'i')
 WHERE email ~* '@kentplc\.com$';

UPDATE public.profiles
   SET functional_email_address = regexp_replace(functional_email_address, '@kentplc\.com$', '@epcmcompany.com', 'i')
 WHERE functional_email_address ~* '@kentplc\.com$';

UPDATE public.profiles
   SET personal_email = regexp_replace(personal_email, '@kentplc\.com$', '@epcmcompany.com', 'i')
 WHERE personal_email ~* '@kentplc\.com$';

UPDATE public.notifications
   SET recipient_email = regexp_replace(recipient_email, '@kentplc\.com$', '@epcmcompany.com', 'i')
 WHERE recipient_email ~* '@kentplc\.com$';

COMMIT;
