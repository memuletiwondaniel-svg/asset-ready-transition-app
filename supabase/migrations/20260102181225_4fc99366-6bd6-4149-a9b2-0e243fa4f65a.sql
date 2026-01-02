UPDATE pssr_reason_categories 
SET name = 'P&E Projects',
    updated_at = now()
WHERE code = 'PROJECT_STARTUP';