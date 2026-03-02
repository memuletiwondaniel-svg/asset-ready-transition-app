
-- Remove create_project and create_pssr permissions from all TA2 roles
DELETE FROM public.role_permissions 
WHERE role_id IN (
  '6bbd12f4-cad2-4ccb-8e73-8710cdca2216',
  '2827cd71-6ae8-4ece-821b-f4ce9ae6cebc',
  '14defdba-4739-4e4e-a94e-c5c560531dc2',
  '23d61604-150c-4edd-8338-30a1da3ab6fb',
  'a71de5b4-8dc4-4ae5-8907-3ba35bd87342',
  'b7c14fae-6856-4024-a0b1-c048b20e7d59',
  '414a5aa3-b962-4884-a7db-c8e12326514a',
  'c0ca8a85-a102-4248-b3bd-0d57e67ec844',
  '41cb8b07-4860-4528-ba85-6952e1e29b67',
  'd80d8585-b843-4ed1-83fa-72ca1097bef8',
  '2ab553a8-953e-4d35-983e-73a1763337c0',
  'b11de257-f5e3-4411-993f-82f562764e67',
  '3b16e158-b055-4733-8390-30584bc22927',
  'ca604123-686a-4599-aafb-d92675475845',
  'dca11c8f-76ea-4b2a-a440-dcc610bcf8cf',
  'fc3d099b-8ac5-4b8a-885b-437366801241',
  '1ced17db-83bb-4dca-a52d-4cf80775336d',
  '4b2c2936-35ab-40a4-97bc-3ccb0ec5e11e',
  '73ccc6bd-243c-4c3a-b331-0bd0343d4bc3',
  '5559dc07-2bc3-4238-80d0-ba966610c92c',
  'd4eaf9c0-ed48-4632-a5b4-861219fee2dd',
  '00b666c3-b900-41b0-8a92-a2b37f6e479e',
  'a03b8e9e-9d6c-434e-b0b6-e80ed3c8f155',
  'f0284734-bc04-45c7-aeed-9d55e232b450'
)
AND permission IN ('create_project', 'create_pssr');
