-- Create function to get all unique topics from checklist items
CREATE OR REPLACE FUNCTION public.get_unique_topics()
RETURNS TABLE(topic text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT checklist_items.topic
  FROM public.checklist_items
  WHERE checklist_items.is_active = true 
    AND checklist_items.topic IS NOT NULL 
    AND trim(checklist_items.topic) != ''
  ORDER BY checklist_items.topic;
$function$;