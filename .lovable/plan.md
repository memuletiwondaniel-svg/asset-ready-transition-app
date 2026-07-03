## Living plan — VCR plan lifecycle + AI-1 item detail

Last updated by the current agent session. Supersedes the previous VCR-04 SoF demo plan.

---

### 1. VCR plan submission lifecycle (shipped)

**Task types**
- `vcr_plan_resubmit` is a first-class user task type (added to `user_tasks_type_check`).
- Categorised under VCR in `useUnifiedTasks.ts` and routed to `VCRExecutionPlanWizard` in edit mode by `TaskKanbanBoard.tsx`.
- Resubmit cards show the same code chip (`extraPill`, e.g. `VCR-05`) and titled `Resubmit VCR Plan: {name}` matching approver cards.
- Progress rendered as `N of 10 steps` from `edit_max_step` / `progress_percentage` written to task metadata by the wizard.
- Reopening a card jumps to `edit_max_step` (non-review modes).

**Submit path (`submit_vcr_plan`)**
- Fetches the approver roster fresh & awaited in `VCRConfirmationStep.handleConfirmSubmit` (Supabase query filtered by `handover_point_id`), with a `useQuery` fallback keeping the on-screen count in sync when jumping straight to Step 10.
- Task `UPDATE` runs unconditionally so `vcr_plan_resubmit` completes even from a `SUBMITTED` state (post scope change). Sets `confirmed_by_sr_ora_engr = true` to satisfy `user_tasks_confirmation_consistency_check`.
- Submission note field is `sticky` at the bottom of the Step 10 scroll container.

**Scope-change re-baseline**
- `public.vcr_scope_fingerprint(uuid)` hashes: Systems, Witness & Hold Points, Training, Procedures, Maintenance Systems, VCR Checklist.
- `submit_vcr_plan` and `decide_vcr_plan_approval` compare fingerprint vs baseline; on change the baseline is voided, approvers reset to `PENDING`, and plan returns to Phase 1.

**Recall**
- `public.recall_vcr_plan(uuid)` resets status → DRAFT, reopens the submitter task, records event.
- "Recall plan" button in wizard + drag-and-drop recall on Kanban.
- `vcr_plan_approval_events_event_type_check` includes `RECALLED` and `CHANGES_REQUESTED`.
- `VCRApprovalHistoryPanel.tsx` has a defensive fallback for unknown `event_type` values.

**Submitted read-only mode**
- `submittedReadOnly` mode in VCR + P2A wizards renders `VCRApprovalStatusPanel.tsx` (phase grouping, progress bars) in place of edit lists. Muted headers, simplified status badges.

---

### 2. AI-1 item detail + readiness insights (shipped)

**Item detail sheet** — `VCRItemDetailSheet.tsx`
- Role-aware layout: Delivering vs Approving views resolved from global task context.
- Actions gated by role + status; sections are toggled blocks; default Sheet close button removed.
- Four decision dialogs: Mark complete, Raise qualification, Accept, Return — with severity-aware advisories.
- Evidence + comments persisted to `p2a_vcr_evidence` and `vcr_item_comments` (no more localStorage).

**Item code alignment**
- `DI2` renamed to `DI` across DB.
- Formatting centralised in `src/lib/vcrItemCode.ts`.

**My-Tasks item aggregators**
- `public.get_my_vcr_item_tasks()` + `useMyVCRItemTasks.ts` surface delivering + approving items.
- Aggregator cards in `useUnifiedTasks.ts`; `VCRItemTaskListSheet.tsx` opens the item list.

**Readiness insights engine** — `compute-vcr-insights` edge function + `useVCRItemInsights.ts`
- **Fred** — aggregates ITRs / punch items across the full system set.
- **Ivan** — vision-extracts HAZOP close-out register from DI-03 HEMP PDFs only (`p2a_prerequisite_attachments`).
- **Selma** — revision pass on every item; also fetches evidence from Assai by doc-no.
- Cache table `vcr_item_insights` keyed by `evidenceFingerprint` (invalidates on file changes).
- Client: 3s timeout fallback, aborts stalled cache reads → `unavailable` without re-compute.
- Server: hard timeouts via `Promise.race`, chunked base64 for PDFs.

**Ivan extraction rigor (round 2)**
- Format-aware "closed" gate requires TSE-TA2 date.
- Bounded vision: 60 s budget, 40 MB cap, 20-page sliding windows (`pdf-lib` + Gemini), `IVAN_WINDOW_OVERLAP = 2` (stride 18) to catch straddling actions.
- Orphan-fragment fallback attaches floating close-out dates to preceding `action_no`.
- Field-by-field merge by `action_no` across windows.
- Reports `partial = true` with lower-bound counts if budget exceeded; `sourceHref` includes page anchors for deep-linking.
- Discipline normalization splits only on hyphens/dashes (preserves `civil/structural`), strips contractor prefixes.

**Selma → Assai → Evidence → Ivan pipeline**
- `p2a_vcr_prerequisites` extended with `assai_doc_no`, `assai_rev`.
- `selma-fetch-assai-evidence` edge function performs idempotent binary downloads, registers as unconfirmed evidence.
- "Fetch from Assai" button + delivering-party confirmation workflow in `VCRItemDetailSheet.tsx`.

**QA harness** — `ivan_qa.ts`
- Scenarios **I1–I6** + **I5b** (straddle w/ no ID on continuation page).
- I5 asserts exact counts (`open == 0, total == 59`).
- Reports parsed counts and specific failure reasons.
- Service-role seed pathway to stage test evidence.

---

### 3. Known open items / next candidates

- Item-detail sheet: verify approver-view empty-state copy across all four decision dialogs on mobile widths.
- Insights engine: publish partial-result UX (banner explaining budget exhaustion and how to re-run).
- Selma-Assai: surface fetch errors per prerequisite in the delivering-party UI.
- Consider promoting the P2A read-only status panel changes into their own doc once the certificate flow lands.

---

### 4. Unrelated infra docs

- `README.md` — generic Lovable scaffold; refreshed with a short "What lives in this repo" pointer to this plan.
- `SETUP_P2A_REMINDERS.md` — P2A approval reminder cron guide; unchanged, still authoritative for that feature.
