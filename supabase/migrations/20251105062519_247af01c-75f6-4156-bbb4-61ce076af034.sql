-- Add translations column to checklist_items table
ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN checklist_items.translations IS 'Stores translations in format: {"ar": {"description": "..."}, "fr": {"description": "..."}, "ms": {"description": "..."}, "ru": {"description": "..."}}';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_checklist_items_translations ON checklist_items USING GIN (translations);

-- Add translations column to checklist_categories table
ALTER TABLE checklist_categories
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN checklist_categories.translations IS 'Stores translations in format: {"ar": {"name": "...", "description": "..."}, "fr": {...}}';

CREATE INDEX IF NOT EXISTS idx_checklist_categories_translations ON checklist_categories USING GIN (translations);

-- Add translations column to checklist_topics table  
ALTER TABLE checklist_topics
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN checklist_topics.translations IS 'Stores translations in format: {"ar": {"name": "...", "description": "..."}, "fr": {...}}';

CREATE INDEX IF NOT EXISTS idx_checklist_topics_translations ON checklist_topics USING GIN (translations);