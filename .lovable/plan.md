## VCR Comments + Closure + SoF Chain

Scope guard confirmed: no prereq/ledger decision-semantics changes, no PSSR SoF changes, no VCR SoF certificate entity.

Validated against code:
- `VCRAssuranceTab.tsx` (403 lines) holds banner + discipline cards + client-side `checkAndCreateFinalizationTask`.
- `useVCRDisciplineAssurance.ts` calls `checkAndCreateFinalizationTask` (also re-exported as `checkVCRFinalizationReadiness`) after each upsert — this is the fragile client path we replace.
- `useVCRSoFApprovers.ts` cascade (all-level-N SIGNED → unlock N+1) runs client-side today.
- `outlook-protocol.ts` exposes `openInTeams` used by PSSR `ScheduleWalkdownModal`.
- `pssr_key_activities` is the analogous per-VCR meeting store — we'll add a VCR-scoped counterpart.

### 1. Discipline drawer (Fix 1 + 2)
- New `DisciplineStatementDrawer` (right-side Sheet): avatar + reviewer + role in header; muted statement panel with date right-aligned underneath; `DECISIONS (N)` section listing each prereq whose `delivering_party_id` matches this discipline — row = item code + title + muted `{Category} · {Topic}` + status chip; click → existing `VCRItemDetailSheet`.
- `VCRAssuranceTab` discipline cards become clickable → open drawer.
- Under complete cards, add collapsed `PENDING (N)` block. Expected set = `DISTINCT delivering_party_id` from `p2a_vcr_prerequisites` for the handover point, minus those with an assurance row. Resolve holder via `useProjectRoleHolders` (fallback role label), two-line row matching complete cards.

### 2. Server-side task pipeline (Fix 3 + 5a)
One migration adding:
- `trg_vcr_discipline_assurance_completion` AFTER INSERT/UPDATE on `vcr_discipline_assurance`:
  - When `statement_type='discipline'` and count of discipline rows == `COUNT(DISTINCT delivering_party_id)` from prereqs for that HP → insert `user_tasks` (`type='vcr_interdisciplinary_summary'`, `action='enter_interdisciplinary_summary'`, title `Enter Interdisciplinary Summary for {vcr label}`), assignee via `resolve_project_role_users('Snr ORA Engr.', variants…)`. Dedupe: existing open row on same `handover_point_id` + type.
  - When `statement_type='interdisciplinary'` INSERT → mark that same open task `completed`; then run closure side-effects:
    - If HP has any linked `p2a_systems.is_hydrocarbon` via `p2a_handover_point_systems`:
      - Flip level-1 `vcr_sof_approvers` rows `LOCKED → PENDING` for the HP.
      - Insert `user_tasks` (`type='task'`, `action='schedule_sof_meeting'`, title `Schedule SoF Meeting for {vcr label}`, Snr ORA Engr, dedupe per HP).
- `trg_vcr_sof_approvers_cascade` AFTER UPDATE on `vcr_sof_approvers`: when all rows at `approver_level=N` for an HP are `SIGNED`, flip `LOCKED → PENDING` at level `N+1`. Moves the frontend cascade server-side.

Retire the task-insert in `checkAndCreateFinalizationTask`; keep the function returning readiness signal only (still used by `useVCRLifecycle` UI). Report the remaining role after.

### 3. Add Statement overlay (Fix 4)
New `InterdisciplinarySummaryModal` — dark overlay per mockup: eyebrow VCR code, title, subtitle with completed-N, chip row of disciplines with checks, textarea (min 30 chars enables `Confirm and complete VCR`). Existing banner CTA and its enable rules unchanged; CTA opens this modal instead of the current small dialog. On confirm → existing interdisciplinary `upsertAssurance` (the new trigger completes the task).

### 4. Closure confirmation state (Fix 5)
After confirm, modal swaps to a success view: green check, `{vcr label} completed`, subtitle `Summary recorded — SoF certificate unlocked for approval` (hydrocarbon) or just the completion line (non-hydrocarbon). Hydrocarbon variant shows optional next-step block `Schedule the SoF meeting?` with Later / Schedule SoF meeting buttons; note "task is already in your list either way". Later → close. Schedule → open ScheduleSofMeetingModal.

### 5. Schedule SoF Meeting modal (Fix 6)
New `ScheduleSofMeetingModal`, entry points:
- Confirmation modal (hydrocarbon)
- Task tile with `action='schedule_sof_meeting'` (wired through existing task-action registry)

Fields per mockup: subject prefilled `SoF Meeting: {project prefix-number} {VCR name} Startup`; required attendees derived from `vcr_sof_approvers` seats resolved via `useProjectRoleHolders`; date/start/duration; invitation body prefilled (project, VCR scope, workspace + SoF-tab links).

Persistence: new table `vcr_key_activities` mirroring `pssr_key_activities` shape (handover_point_id, activity_type='sof_meeting', scheduled_at, duration_minutes, subject, body, attendees jsonb, created_by). Save → insert row + complete `schedule_sof_meeting` task. Open in Teams → `openInTeams()` + complete task.

Migration will include GRANTs + RLS (project-team-scoped read/write via existing helpers).

### 6. QAQC + summary (Fix 7)
Run QAQC suite once and report totals. New surfaces to add to Task Type Reference:
- `type='vcr_interdisciplinary_summary'` / `action='enter_interdisciplinary_summary'`
- `action='schedule_sof_meeting'` (on `type='task'`)
- Triggers: `trg_vcr_discipline_assurance_completion`, `trg_vcr_sof_approvers_cascade`
- Table: `vcr_key_activities`

### Technical notes
- Hydrocarbon detection in SQL: `EXISTS (select 1 from p2a_handover_point_systems hps join p2a_systems s on s.id=hps.system_id where hps.handover_point_id = _hp and s.is_hydrocarbon)`.
- All new triggers use `SECURITY DEFINER` with `SET search_path = public`.
- Task inserts use `resolve_project_role_users` with canonical `'Snr ORA Engr.'` + the existing variant fallback pattern used elsewhere in migrations.
- Frontend SoF flip in `useVCRSoFApprovers.sign` becomes redundant — leave in place (harmless idempotent), note in the summary.
- Dedupe rule for new task inserts: `WHERE handover_point_id = _hp AND type = ? AND status NOT IN ('completed','cancelled')`.

### Diff surface
Frontend:
- `src/components/widgets/VCRAssuranceTab.tsx` (cards clickable, PENDING block, open new modal)
- new `src/components/widgets/DisciplineStatementDrawer.tsx`
- new `src/components/widgets/InterdisciplinarySummaryModal.tsx`
- new `src/components/widgets/ScheduleSofMeetingModal.tsx`
- `src/components/widgets/hooks/useVCRDisciplineAssurance.ts` (drop task-insert)
- task-action registry hookup for `schedule_sof_meeting` + `enter_interdisciplinary_summary`

DB (one migration):
- 2 triggers + supporting SQL functions
- `vcr_key_activities` table (with GRANTs + RLS)

No PSSR files touched. No changes to prereq or ledger logic.

Confirm to proceed and I'll ship it in one pass.