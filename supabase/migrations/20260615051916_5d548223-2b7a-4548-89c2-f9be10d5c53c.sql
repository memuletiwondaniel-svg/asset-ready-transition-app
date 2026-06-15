
BEGIN;

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B1','auth.users','email', id::text, id, email,
       regexp_replace(email, '@basrahgas\.iq$', '@gascompany.iq', 'i')
FROM auth.users WHERE email ~* '@basrahgas\.iq$';

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B1','auth.identities','identity_data.email', id::text, user_id,
       identity_data->>'email',
       regexp_replace(identity_data->>'email', '@basrahgas\.iq$', '@gascompany.iq', 'i')
FROM auth.identities
WHERE provider='email' AND identity_data->>'email' ~* '@basrahgas\.iq$';

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B1','profiles','email', id::text, id, email,
       regexp_replace(email, '@basrahgas\.iq$', '@gascompany.iq', 'i')
FROM public.profiles WHERE email ~* '@basrahgas\.iq$';

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B1','profiles','functional_email_address', id::text, id, functional_email_address,
       regexp_replace(functional_email_address, '@basrahgas\.iq$', '@gascompany.iq', 'i')
FROM public.profiles WHERE functional_email_address ~* '@basrahgas\.iq$';

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B1','profiles','personal_email', id::text, id, personal_email,
       regexp_replace(personal_email, '@basrahgas\.iq$', '@gascompany.iq', 'i')
FROM public.profiles WHERE personal_email ~* '@basrahgas\.iq$';

INSERT INTO public._email_rename_backup(stage, table_name, column_name, row_pk, user_id, old_value, new_value)
SELECT 'B1','notifications','recipient_email', id::text, recipient_user_id, recipient_email,
       regexp_replace(recipient_email, '@basrahgas\.iq$', '@gascompany.iq', 'i')
FROM public.notifications WHERE recipient_email ~* '@basrahgas\.iq$';

UPDATE auth.users
   SET email = regexp_replace(email, '@basrahgas\.iq$', '@gascompany.iq', 'i')
 WHERE email ~* '@basrahgas\.iq$';

UPDATE auth.identities
   SET identity_data = jsonb_set(identity_data, '{email}',
        to_jsonb(regexp_replace(identity_data->>'email', '@basrahgas\.iq$', '@gascompany.iq', 'i')))
 WHERE provider='email' AND identity_data->>'email' ~* '@basrahgas\.iq$';

UPDATE public.profiles
   SET email = regexp_replace(email, '@basrahgas\.iq$', '@gascompany.iq', 'i')
 WHERE email ~* '@basrahgas\.iq$';

UPDATE public.profiles
   SET functional_email_address = regexp_replace(functional_email_address, '@basrahgas\.iq$', '@gascompany.iq', 'i')
 WHERE functional_email_address ~* '@basrahgas\.iq$';

UPDATE public.profiles
   SET personal_email = regexp_replace(personal_email, '@basrahgas\.iq$', '@gascompany.iq', 'i')
 WHERE personal_email ~* '@basrahgas\.iq$';

UPDATE public.notifications
   SET recipient_email = regexp_replace(recipient_email, '@basrahgas\.iq$', '@gascompany.iq', 'i')
 WHERE recipient_email ~* '@basrahgas\.iq$';

COMMIT;
