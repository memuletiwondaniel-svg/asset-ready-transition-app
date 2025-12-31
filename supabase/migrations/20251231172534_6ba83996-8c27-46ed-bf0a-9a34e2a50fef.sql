-- Drop checklist-related tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS checklist_item_approval_responses CASCADE;
DROP TABLE IF EXISTS checklist_item_approving_disciplines CASCADE;
DROP TABLE IF EXISTS checklist_item_delivering_parties CASCADE;
DROP TABLE IF EXISTS checklist_template_items CASCADE;
DROP TABLE IF EXISTS checklist_templates CASCADE;
DROP TABLE IF EXISTS checklist_filter_presets CASCADE;
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS checklist_categories CASCADE;
DROP TABLE IF EXISTS checklist_topics CASCADE;
DROP TABLE IF EXISTS checklists CASCADE;
DROP TABLE IF EXISTS custom_reasons CASCADE;

-- Drop the checklist_id column from pssr_reason_configuration table
ALTER TABLE pssr_reason_configuration DROP COLUMN IF EXISTS checklist_id;