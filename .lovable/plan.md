

## Plan: VCR Discipline Assurance Statements (Comments Tab)

### Context

VCRs and PSSRs are **separate workflows**. Projects use VCRs; PSSRs are a distinct process. VCR items are assigned to delivering parties (TAs) via `delivering_party_role_id` on `p2a_vcr_prerequisites`. Each TA discipline reviews their assigned VCR items. The "Comments" tab in the VCR Detail Overlay should display **discipline assurance statements** -- formal readiness declarations from each TA who reviewed VCR items, plus an interdisciplinary statement from the VCR Lead.

This is entirely within the VCR domain -- no dependency on PSSR tables.

---

### 1. Create `vcr_discipline_assurance` table

New Supabase migration:

```sql
CREATE TABLE public.vcr_discipline_assurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_point_id UUID NOT NULL REFERENCES p2a_handover_points(id) ON DELETE CASCADE,
  discipline_role_id UUID REFERENCES roles(id),
  discipline_role_name TEXT NOT NULL,
  reviewer_user_id UUID,
  assurance_statement TEXT NOT NULL,
  statement_type TEXT NOT NULL DEFAULT 'discipline'
    CHECK (statement_type IN ('discipline', 'interdisciplinary')),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(handover_point_id, discipline_role_name)
);

ALTER TABLE public.vcr_discipline_assurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assurance statements"
  ON public.vcr_discipline_assurance FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert assurance statements"
  ON public.vcr_discipline_assurance FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own statements"
  ON public.vcr_discipline_assurance FOR UPDATE
  TO authenticated USING (reviewer_user_id = auth.uid());
```

### 2. Create hook `useVCRDisciplineAssurance`

New file: `src/components/widgets/hooks/useVCRDisciplineAssurance.ts`

- `useQuery` to fetch all assurance statements for a given `handover_point_id`
- Join with profiles to get reviewer name/avatar
- `useMutation` to submit/upsert a discipline assurance statement
- Derive which disciplines have/haven't submitted based on the distinct `delivering_party_role_id` values from `p2a_vcr_prerequisites`

### 3. Build `VCRAssuranceTab` component

New file: `src/components/widgets/VCRAssuranceTab.tsx`

Layout:
- **Interdisciplinary Assurance Statement** card at top (from VCR Lead / PSSR Lead, `statement_type = 'interdisciplinary'`)
  - If not yet submitted: empty state with prompt
- **Discipline Assurance Statements** section below
  - One card per delivering discipline (derived from distinct `delivering_party_role_id` on VCR items)
  - Each card shows: discipline name, reviewer avatar + name, statement text, submission timestamp
  - Disciplines that haven't submitted show a muted "Pending" state
  - If current user is the TA for a discipline, show a text input to submit their statement

### 4. Wire into VCR Detail Overlay

In `src/components/widgets/VCRDetailOverlay.tsx`:
- Add `case 'comments'` in `renderContent()` to render `VCRAssuranceTab`
- Pass `handoverPointId` and `projectId`

### 5. Add discipline completion flow to VCR item review

When a TA finishes reviewing all their assigned VCR items (all items for their `delivering_party_role_id` are in a terminal status), prompt them with a modal to enter their **Discipline Assurance Statement** before marking their review as complete. This mirrors the `DisciplineCompletionPanel` pattern but is VCR-specific:

- New component: `src/components/widgets/VCRDisciplineCompletionPanel.tsx`
- Triggered when the last VCR item for a discipline reaches approved/completed status
- Required field: assurance statement text
- On submit: upserts into `vcr_discipline_assurance`

### Files to create
- `src/components/widgets/hooks/useVCRDisciplineAssurance.ts`
- `src/components/widgets/VCRAssuranceTab.tsx`
- `src/components/widgets/VCRDisciplineCompletionPanel.tsx`
- Migration SQL for `vcr_discipline_assurance` table

### Files to modify
- `src/components/widgets/VCRDetailOverlay.tsx` (add comments case)

