UPDATE pssr_reason_categories 
SET name = 'P&E Project Startup',
    description = 'Start-up related to project delivery by P&E',
    updated_at = now()
WHERE code = 'PROJECT_STARTUP';