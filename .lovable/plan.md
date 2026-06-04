## VCR-04 Compressor C and D — demo wiring + seed

### A. Code changes

**1. `SOFCertificate` (VCR mode) — add per-approver status + signing UI**
- Extend `SOFApprover` to carry `status` (`SIGNED` | `PENDING` | `LOCKED`), `signed_at`, `signature_data`.
- When `sourceType="VCR"`, render each approver row with a status pill, signed date, and (for SIGNED) the signature SVG read from localStorage (`marije-hoedemaker-signature`, `ali-danbous-signature`, `paul-vandenhemel-signature`).
- For the current user's row, when status is `PENDING`, show a "Sign" button that opens `SOFSignatureDialog` → `SignatureCanvas`. On submit, save signature to localStorage and to `user_signatures`, flip a `vcr_sof_approver` row to SIGNED, and refetch.
- Pull the approver status from a new lightweight table (see B.1) instead of localStorage state.

**2. `VCRDetailOverlay` — feed real status into SoF tab**
- New query `useVCRSoFApprovers(vcrId)` reads `vcr_sof_approvers` rows for the VCR and merges them with the existing director-by-position resolver (so names/avatars still come from `profiles`, but status comes from the seeded rows).
- Pass merged approvers into `<SOFCertificate sourceType="VCR" approvers={...} />`.
- When all approvers SIGNED, set `p2a_handover_points.sof_signed_at` and flip `status` to `SIGNED`.

**3. `DirectorSoFView` + `useSOFAwaitingDirectorReview` — surface VCR tasks**
- Extend the hook to also fetch `vcr_sof_approvers` rows where `user_id = current` and `status = 'PENDING'`, returning a unioned list tagged with `source: 'PSSR' | 'VCR'`.
- In `DirectorSoFView`, when the user clicks a VCR-sourced item, navigate to the VCR detail overlay (open `VCRDetailOverlay` with `activeNav='sof'`) instead of `SOFReviewOverlay`. Reuse existing route to P2A Handover workspace with a query param `?vcr=<id>&tab=sof`.
- Keep PSSR items working unchanged.

**4. Mock approver rewrite (per your earlier answer)**
- Rewrite `getMockApproversForOverlay` so the demo ordering is Marije SIGNED → Ali SIGNED → Paul PENDING/OPEN. Adjust the post-approval branch accordingly (no further approvers after Paul).

### B. Schema (new migration)

**B.1 `vcr_sof_approvers` table**
Columns: `id`, `handover_point_id` (FK), `user_id` (FK), `approver_name`, `approver_role`, `approver_level` (1-4), `status` (`SIGNED`/`PENDING`/`LOCKED`), `signed_at`, `signature_data`, timestamps.
RLS: authenticated read all; update own row only.
Grants for `authenticated` + `service_role`.

### C. Seed data (insert tool, after schema migration approved)

**Plan content** for VCR-04 (`3f92ec99-886d-4e92-914b-428f92a7e9c0`):
- Add 4 missing HC catalog systems to DP-300 plan (`Compressor Lube Oil`, `Anti-Surge System`, `Suction Scrubbers`, plus split `Gas Compressor C` / `Gas Compressor D` — currently only one combined `Gas Compressors` row). Map all 5 to VCR-04.
- 6 procedures (with `assign_procedure_document_number`), 12 critical docs, 5 training items, 2 register selections (LOLC, Override), 3 logsheets, 6 maintenance deliverables.
- 20 prerequisites: 9 ACCEPTED + 11 QUALIFICATION_APPROVED.
- 11 qualifications APPROVED with the exact reviewer_comments / mitigations / owners from the brief (4 EQP, 3 DOC, 2 TRN, 2 SPR).

**SoF approver rows** in new `vcr_sof_approvers`:
- Marije Hoedemaker (P&E Director, lvl 1) — SIGNED 3d ago, signature_data = stored SVG.
- Ali Danbous (HSE Director, lvl 2) — SIGNED 2d ago, signature_data = stored SVG.
- Paul Van Den Hemel (P&M Director, lvl 3) — PENDING, no signature.
- Plant Director (lvl 4) — LOCKED (or omit if 3-approver model preferred).

**VCR state**: `status='IN_APPROVAL'`, `execution_plan_approved_at` = 14d ago, `sof_signed_at=NULL`.

### D. End-to-end verification
Run all 13 verification steps from your brief in the live preview as Paul. STOP and report on any step that breaks.

### Open questions before I start
1. **3 approvers or 4?** Brief lists Marije + Ali + Paul (3). VCR overlay director resolver lists 4 (Plant + P&E + P&M + HSE). Use 3 for the demo (drop Plant Director) or 4 with Plant Director also SIGNED?
2. **Signature SVGs**: existing code reads `marije-hoedemaker-signature` and `ali-danbous-signature` from localStorage. To make the demo work cross-browser, should I bundle these SVGs as constants in code and seed them into `signature_data` columns? Or rely on whatever the demo browser has cached?
3. **Catalog systems**: OK to add the 4 missing HC compressor systems to DP-300's plan catalog, or should the seed reuse only the existing single `Gas Compressors` row?

### Technical notes
- Files touched: `src/components/handover/SOFCertificate.tsx`, `src/components/widgets/VCRDetailOverlay.tsx`, `src/components/tasks/DirectorSoFView.tsx`, `src/hooks/useSOFAwaitingDirectorReview.ts`, new `src/hooks/useVCRSoFApprovers.ts`, plus migration + insert scripts.
- No changes to `sof_certificates` / `sof_approvers` (PSSR-only path stays intact).
- No changes to VCR-01/02/03/05.
