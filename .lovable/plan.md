

# UX Polish & Data Fix — 7 Changes Across 6 Files

## 1. Colored Session Tags — `TrainingHistoryPanel.tsx`
**Line 427**: Replace `variant="outline"` Badge with rotating color palette:
```tsx
const tagColors = [
  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
];
```
Apply `tagColors[i % tagColors.length]` to each Badge className. Add `hover:shadow-md` to session cards (line 274, the non-expanded branch).

## 2. Manual Sync Button — `CompetencyProfilePanel.tsx` + `CompetencyDrawer.tsx`
Add props `hasCompletedSessions: boolean` and `onSyncCompetencies: () => Promise<void>` to `CompetencyProfilePanel`. When `overallProgress === 0 && hasCompletedSessions`, show a "Sync from training history" button with loading state below the donut summary. Wire from `CompetencyDrawer` which has sessions data and supabase import. Also add `hover:shadow-md` to competency rows (line 97).

## 3. "Open Workspace" CTA — `CompetencyInlineSummary.tsx`
- Rename "Open Training Workspace →" to "Open Workspace →" (line 57)
- Add CTA classes: `bg-primary/5 border border-primary/30 hover:bg-primary/10 text-primary font-medium`

## 4. Tighter Progress Bars — `CompetencyInlineSummary.tsx`
- Line 69: Remove `flex-1` from name span, add `max-w-[200px] truncate`
- Line 67: Reduce row gap from `gap-2.5` to `gap-2`

## 5. Remove "Agent Monitor" Sub-header — `AgentMonitorCard.tsx`
- Delete lines 43-49 (CardTitle with duplicate Activity icon + "Agent Monitor" text)
- Line 52: Change Activity tab icon to `Clock` (import Clock from lucide-react)

## 6. Bolder Card Headers — `AgentProfileView.tsx`
- Line 99: Change `text-[10px] font-semibold text-muted-foreground/60` → `text-[11px] font-bold text-muted-foreground/80`
- Line 94: Add `bg-muted/15` to the header row base className

## 7. Enhanced Hover — `CompetencyProfilePanel.tsx` + `TrainingHistoryPanel.tsx`
- Competency rows (line 97): add `hover:shadow-md`
- Session cards (line 279): add `hover:shadow-md`

---

**Files**: `TrainingHistoryPanel.tsx`, `CompetencyProfilePanel.tsx`, `CompetencyDrawer.tsx`, `CompetencyInlineSummary.tsx`, `AgentMonitorCard.tsx`, `AgentProfileView.tsx`

