-- Add new columns for the unique ID system
ALTER TABLE public.checklist_items 
ADD COLUMN category_ref_id text,
ADD COLUMN sequence_number integer,
ADD COLUMN unique_id text UNIQUE;

-- Create function to generate category ref IDs
CREATE OR REPLACE FUNCTION get_category_ref_id(category_name text)
RETURNS text AS $$
BEGIN
  CASE LOWER(category_name)
    WHEN 'general' THEN RETURN 'GN';
    WHEN 'process safety' THEN RETURN 'PS';
    WHEN 'organization' THEN RETURN 'OR';
    WHEN 'health & safety' THEN RETURN 'HS';
    WHEN 'emergency response' THEN RETURN 'ER';
    WHEN 'paco' THEN RETURN 'IN';
    WHEN 'static' THEN RETURN 'MS';
    WHEN 'rotating' THEN RETURN 'MR';
    WHEN 'civil' THEN RETURN 'CX';
    WHEN 'elect' THEN RETURN 'EL';
    ELSE RETURN 'XX'; -- Default for unknown categories
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing records with category ref IDs and sequence numbers
WITH numbered_items AS (
  SELECT 
    ctid,
    category,
    get_category_ref_id(category) as ref_id,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at) as seq_num
  FROM public.checklist_items
  WHERE is_active = true
)
UPDATE public.checklist_items 
SET 
  category_ref_id = numbered_items.ref_id,
  sequence_number = numbered_items.seq_num,
  unique_id = numbered_items.ref_id || LPAD(numbered_items.seq_num::text, 2, '0')
FROM numbered_items 
WHERE public.checklist_items.ctid = numbered_items.ctid;

-- Create function to update sequence numbers within a category
CREATE OR REPLACE FUNCTION update_checklist_sequence_numbers(target_category text)
RETURNS void AS $$
BEGIN
  WITH numbered_items AS (
    SELECT 
      ctid,
      ROW_NUMBER() OVER (ORDER BY sequence_number, created_at) as new_seq_num
    FROM public.checklist_items
    WHERE category = target_category AND is_active = true
  )
  UPDATE public.checklist_items 
  SET 
    sequence_number = numbered_items.new_seq_num,
    unique_id = category_ref_id || LPAD(numbered_items.new_seq_num::text, 2, '0')
  FROM numbered_items 
  WHERE public.checklist_items.ctid = numbered_items.ctid;
END;
$$ LANGUAGE plpgsql;

-- Create function to reorder checklist item
CREATE OR REPLACE FUNCTION reorder_checklist_item(
  item_unique_id text,
  new_position integer
)
RETURNS void AS $$
DECLARE
  item_category text;
  current_position integer;
BEGIN
  -- Get current item details
  SELECT category, sequence_number INTO item_category, current_position
  FROM public.checklist_items
  WHERE unique_id = item_unique_id AND is_active = true;
  
  IF item_category IS NULL THEN
    RAISE EXCEPTION 'Checklist item not found';
  END IF;
  
  -- Update the target item's position
  UPDATE public.checklist_items
  SET sequence_number = new_position
  WHERE unique_id = item_unique_id;
  
  -- Reorder all items in the category
  PERFORM update_checklist_sequence_numbers(item_category);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-assign unique IDs for new items
CREATE OR REPLACE FUNCTION assign_checklist_unique_id()
RETURNS TRIGGER AS $$
DECLARE
  ref_id text;
  next_seq integer;
BEGIN
  -- Get category ref ID
  ref_id := get_category_ref_id(NEW.category);
  
  -- Get next sequence number for this category
  SELECT COALESCE(MAX(sequence_number), 0) + 1 
  INTO next_seq
  FROM public.checklist_items 
  WHERE category = NEW.category AND is_active = true;
  
  -- Assign values
  NEW.category_ref_id := ref_id;
  NEW.sequence_number := next_seq;
  NEW.unique_id := ref_id || LPAD(next_seq::text, 2, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checklist_item_unique_id_trigger
  BEFORE INSERT ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION assign_checklist_unique_id();