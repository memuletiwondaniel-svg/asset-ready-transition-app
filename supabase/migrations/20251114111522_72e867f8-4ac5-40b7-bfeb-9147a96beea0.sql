-- Update Daniel Memuletiwon's role to admin to allow user deletion
UPDATE user_roles 
SET role = 'admin'
WHERE user_id = '05b44255-4358-450c-8aa4-0558b31df70b'
AND role = 'user';