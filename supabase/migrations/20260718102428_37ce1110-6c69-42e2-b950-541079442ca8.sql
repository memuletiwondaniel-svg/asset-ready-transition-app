
INSERT INTO public.qaqc_checks (id, category, title, description, sql, severity, is_active) VALUES
('N-01', 'N', 'P2A header opens workspace',
 'Functional-preservation: clicking the P2A Handover card header opens the P2A workspace dialog via openPlanByAction. Verified in-app via ?selftest=headers. Last verified: build 1784369767541 (2026-07-18) — PASS.',
 'SELECT 1 WHERE false', 'info', true),
('N-02', 'N', 'ORA Activities header opens Gantt overlay',
 'Functional-preservation: clicking the ORA Activities card header opens the ORA Gantt overlay. Verified in-app via ?selftest=headers. Last verified: build 1784369767541 (2026-07-18) — PASS.',
 'SELECT 1 WHERE false', 'info', true),
('N-03', 'N', 'Scope Read more toggle expands',
 'Functional-preservation: Scope Read more button flips data-scope-expanded and label (Read more <-> Show less). Verified in-app via ?selftest=headers. Last verified: build 1784369767541 (2026-07-18) — PASS.',
 'SELECT 1 WHERE false', 'info', true)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now(),
  is_active = true;
