-- Step 1: Reassign Martyn Turner to Projects commission with updated position
UPDATE profiles 
SET 
  commission = 'f767335c-7bd1-418d-a9f8-6c8b1233dad0',
  position = 'Engr. Manager - Projects'
WHERE id = '5ae49149-e586-4385-8569-6df7117dc2c3';

-- Step 2: Reassign Marije Hoedemaker to Projects commission (keep P&E Director title)
UPDATE profiles 
SET commission = 'f767335c-7bd1-418d-a9f8-6c8b1233dad0'
WHERE id = '9701c5ba-9d9e-46e7-9431-0613cd9c7260';

-- Step 3: Deactivate P&E Commission
UPDATE commission 
SET is_active = false 
WHERE id = 'e3061535-c34a-4694-b373-1e3cb4e6058a';