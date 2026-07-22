
CREATE TYPE public.p2a_evidence_source AS ENUM (
  'manual','uploaded','assai',
  'promoted_procedure','promoted_training','promoted_register','promoted_maintenance'
);
CREATE TYPE public.p2a_evidence_kind AS ENUM (
  'red_line_markup','signed_procedure','attendance_list',
  'punchlist_register','lolc_register','audit_actions_register',
  'qualification_letter','assai_document','other'
);
