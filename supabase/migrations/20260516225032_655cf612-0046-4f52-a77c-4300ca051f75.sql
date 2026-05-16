-- Update CMS mock data: Iraqi names + 8-digit staff IDs
UPDATE public.cms_people
SET first_name = 'Ahmed',
    last_name = 'Jassim',
    staff_id = '10000001'
WHERE id = '33333333-3333-3333-3333-333333333301';

UPDATE public.cms_people
SET first_name = 'Fatima',
    last_name = 'Khalil',
    staff_id = '10000002'
WHERE id = '33333333-3333-3333-3333-333333333302';

UPDATE public.cms_people
SET first_name = 'Mohammed',
    last_name = 'Al-Rashid',
    staff_id = '10000003'
WHERE id = '33333333-3333-3333-3333-333333333303';

UPDATE public.cms_people
SET first_name = 'Layla',
    last_name = 'Hussein',
    staff_id = '10000004'
WHERE id = '33333333-3333-3333-3333-333333333304';

UPDATE public.cms_people
SET first_name = 'Omar',
    last_name = 'Qasim',
    staff_id = '10000005'
WHERE id = '33333333-3333-3333-3333-333333333305';