ALTER TABLE public.vcr_item_insights
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'computed'
  CHECK (origin IN ('computed','synthetic'));

UPDATE public.vcr_item_insights
SET origin = 'synthetic'
WHERE computed_at = '2026-07-09 19:08:34.304654+00'
  AND vcr_item_id IN (
    '6c1f2465-2f78-4567-ab25-c87f537b4d54',
    '7c84d396-2927-447d-bcfe-a35eed32db8d'
  );