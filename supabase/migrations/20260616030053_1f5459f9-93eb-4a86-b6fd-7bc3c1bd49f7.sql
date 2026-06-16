UPDATE auth.users
SET encrypted_password = crypt('anuarbek0000', gen_salt('bf')),
    updated_at = now()
WHERE id='49d052ff-e30f-4b1f-b10b-7edeb83db97e';