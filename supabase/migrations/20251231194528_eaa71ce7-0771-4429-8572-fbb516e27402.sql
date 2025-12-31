-- Delete the duplicate "Technical Safety" discipline
DELETE FROM discipline WHERE id = 'edefd3bb-aa8c-4faa-9096-3cfb16e0b956';

-- Assign Tech Safety discipline to Andrew Banford
UPDATE profiles 
SET discipline = '4f92bf19-201b-4fcb-8c55-509aca8efde8'
WHERE user_id = '5a651906-a022-4084-af11-afe35a03cef1';