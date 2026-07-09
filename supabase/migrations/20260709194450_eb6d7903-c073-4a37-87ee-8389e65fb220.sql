UPDATE public.vcr_item_insights
SET payload = payload - 'sources'
WHERE vcr_id = '96b44257-5c3b-4ec8-be04-1ada2d792257'
  AND vcr_item_id IN ('6c1f2465-2f78-4567-ab25-c87f537b4d54','7c84d396-2927-447d-bcfe-a35eed32db8d');