
-- Remove admin role from users who should no longer be admins
-- Keeping only: Daniel Memuletiwon, Roaa Abdullah, Paul Van Den Hemel
DELETE FROM public.user_roles 
WHERE role = 'admin'::public.user_role
AND user_id IN (
  'd9f75bc9-aa32-4822-b1e5-5f6bd6049efd',  -- Christian Johnsen
  '0942bfe3-17b5-41a7-920e-c0802b9764b2',  -- Martyn Turner
  '83f6a3e5-82ea-4ae2-a38b-df3ca589bffa',  -- Yesr Tamoul
  '52d07b04-bd60-4980-9f78-f2353b1bcbf9',  -- Ali Danbous
  'bd8dd7af-6bd4-4ca5-99ca-20bd53e38b4e',  -- Marije Hoedemaker
  '3a4faa89-093a-4116-97ff-a08d14ee6a48'   -- Abel Maouche
);
