

# Agent Profile & Training Workspace — UX Modernization
## Final Plan (Sr Developer Approved with 2 Clarifications)

Both your proposal and the Sr Developer's are in full agreement. The two clarifications are incorporated below.

---

## 7 Files, All Changes Final

### File 1: `AgentProfileView.tsx`
**A1 — Embed section headers inside cards.** Replace the standalone `SectionHeader` component (lines 34-65) with an inline card header pattern. Each `Collapsible` section becomes a single `Card` where the header row (icon + label + chevron) is the card's top bar with `hover:bg-muted/30 cursor-pointer` and `border-b border-border/30`. Remove the floating `SectionHeader` component entirely.

**A2 — Remove Specializations & Limitations.** Delete lines 173-243 (the grid with spec/limit badges). Remove `showAllSpecs`, `showAllLimits`, `SPEC_VISIBLE`, `LIMIT_VISIBLE` state/constants. Remove `Check`, `X` imports.

**A3 — Rename** "Knowledge & Training" to "Competence Development" (line 255).

**Wire competence chat:** Add state for `competenceChatTitle`. When competence CTA fires from drawer, close drawer, set title to "Competence Development", open training dialog. Pass `initialSessionTitle` and `competencies` array to `AgentTrainingStudio`.

### File 2: `CompetencyInlineSummary.tsx`
- Donut: `size={48}` → `size={72}`
- Stats text: `text-sm font-semibold` → `text-xs text-muted-foreground`
- Show 5 areas: `.slice(0, 3)` → `.slice(0, 5)`, update "+N more" from 3 to 5
- Remove `AlertTriangle` import and conditional rendering
- **Keep coloured dot** for ALL rows (remove the `progress < 50` conditional — always show dot)
- Widen progress bar: `w-20` → `w-28`

### File 3: `CompetencyDonut.tsx`
- Extend size type: `48 | 64` → `48 | 64 | 72 | 80`
- Scale ring thickness for new sizes (72 → 8px offset, 80 → 9px offset)
- Scale center text: `size >= 72 ? 'text-sm font-bold' : 'text-[10px] font-bold'`

### File 4: `CompetencyDrawer.tsx`
- **Avatar in header:** Add `<img src={agent.avatar}>` (w-6 h-6 rounded-full) next to name
- **Remove "Ask Fred" tab:** Remove `chat` from tabs array and its content block. Two tabs only: Competence | Sessions.
- **Tab styling:** Selected: `bg-primary/10 text-primary font-semibold`. Unselected: `text-muted-foreground/70 hover:text-foreground hover:bg-muted/50`
- **Backfill trigger:** `useEffect` + `useRef` guard. On drawer open, if `competencies.every(c => c.progress === 0)` AND `sessions.some(s => s.status === 'completed')`, invoke `assess-agent-competencies`. Show "Syncing competency profile..." indicator.
- **Pass competencies to training dialog:** New `onOpenCompetenceChat` callback that passes `competencies[]` array (not just title string) to the parent, which forwards to `AgentTrainingStudio` as context for the system prompt.

### File 5: `CompetencyProfilePanel.tsx`
- Donut: `size={64}` → `size={80}`
- Hover on rows: `hover:bg-muted/50 transition-colors duration-150 rounded-lg border-l-2 border-transparent hover:border-primary/30`
- New CTA after "Add Competency Area": separator + ghost button "Discuss competencies with {agentName}" calling `onOpenCompetenceChat` prop
- New props: `agentName: string`, `onOpenCompetenceChat: () => void`

### File 6: `TrainingHistoryPanel.tsx`
- **C1 — Remove P&ID Training Path** (lines 215-269): Delete entire block
- **C2 — Retrain/Test into dropdown:** Remove standalone buttons (lines 370-377). Add as `DropdownMenuItem` entries. Trigger: `opacity-0 group-hover:opacity-100`. Also add View & Verify, Flag, and Unverify as dropdown items.
- **C3 — Remove ChevronDown** (line 395)
- **C4 — Remove "No metadata":** Line 347 — render nothing when domain/type are empty
- **C5 — Inline metadata:** Move `ConfidenceDots` and stats to same row as document name + date, `text-[10px]`
- **C6 — Remove verified banner** (lines 454-468): Delete. Keep inline `GovernanceBadges`. Unverify goes to dropdown.
- **C7 — Active card highlighting (CLARIFICATION APPLIED):** Expanded: `ring-1 ring-primary/20 bg-card shadow-sm`. Non-expanded when any is expanded: `opacity-50 transition-all duration-200`. **NO `pointer-events-none`** — user must be able to click dimmed cards to switch focus.
- **C8 — Simplify pending banner:** Remove View & Verify and Flag buttons from banner (they're now in dropdown). Banner becomes text-only status indicator. Flagging textarea still triggers from dropdown item.

### File 7: `AgentTrainingStudio.tsx`
- Add optional `initialSessionTitle?: string` prop — pre-fills `docName` state on mount
- Add optional `competencyContext?: CompetencyArea[]` prop — when provided, includes the full competency profile in the system prompt sent to the training edge function, so the agent has awareness of its competency areas during a "Competence Development" session

---

## What Does NOT Change
- Mobile/tablet layouts
- Sidebar, routing, auth
- Performance/Monitor card
- Theme tokens, design system
- About card bio text, "Works with" section

