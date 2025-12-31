-- Clear all approving_authority values from checklist items
UPDATE pssr_checklist_items SET approving_authority = NULL;