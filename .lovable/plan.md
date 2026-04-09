

## Integrated Fix: Admin Tools Loading Flash + Stale State Prevention

### Comparison of Proposals

**Senior developer's proposal** identifies two concrete, immediately actionable bugs:
1. Skeleton shows old large-card layout (causes visual flash) — correct, confirmed at lines 622-640
2. Collapsed section state not persisted — correct, `collapsedSections` is plain `useState` at line 130

**My earlier proposal** identified three issues:
1. Orphaned build guard (`adminAiBuild.ts` unused) — correct but over-engineered; the real fix is simpler
2. Legacy favorite normalization maps to `ai-agents-hub` which no longer exists as a card — correct
3. Hook-order bug in `AuthenticatedLayout.tsx` — separate issue, out of scope for this fix

### Assessment

The senior developer's Bug 1 and Bug 2 are immediately correct and should be built as-is. However, his Bug 2 Step 3 (rename `AI AGENT` back to `AI AGENTS`) is **rejected** — the singular was an intentional design decision and all rendering logic (lines 762, 769) references `'AI AGENT'`. Renaming would require updating multiple string comparisons and risks introducing the exact stale-state bug we're fixing.

My additional finding about `useUserScopedFavorites` normalizing legacy IDs to `ai-agents-hub` (which doesn't exist as a card) is valid and should be included — those legacy mappings should remove the IDs entirely rather than remap them.

### What to Build

**Fix 1 — Replace skeleton with section-matching layout** (lines 616-641 of `AdminToolsPage.tsx`)

Replace the 6 large `<Card>` skeleton grid with a skeleton that matches the current design:
- Same `max-w-6xl` container (not `max-w-7xl`)
- Search bar skeleton (h-9, not h-10)
- 3 collapsible section skeletons, each with a header row (chevron + label + divider + count) and a grid of 3 compact `h-[72px]` card placeholders
- Zero layout shift when real content loads

**Fix 2 — Persist collapsed sections to localStorage** (lines 130-132 of `AdminToolsPage.tsx`)

- Add `COLLAPSED_SECTIONS_KEY = 'orsh-admin-collapsed-sections'` constant
- Replace the `useState` initializer with a lazy function that reads from localStorage, falling back to the default set
- Add a `useEffect` to persist `collapsedSections` on every change
- Keep the default set as `['USER MANAGEMENT', 'LIVING DOCUMENTATION', 'AI AGENT', 'INTEGRATIONS', 'SYSTEM', 'OPERATIONS & CONFIGURATION']` (note: `AI AGENT` singular, matching the current section label)

**Fix 3 — Sanitize legacy favorite IDs** (`useUserScopedFavorites.ts` lines 25-30)

Change the `legacyAdminFavoriteMap` to map all legacy AI admin IDs to `null` (removal) instead of `ai-agents-hub`:
```
'agent-registry': null,
'training-feedback': null,
'training-and-feedback': null,
'ai-training-feedback': null,
'ai-agents-hub': null,
```
Update the normalization to filter out null-mapped IDs rather than remapping them. This prevents stale favorites from pointing to non-existent cards.

### Files

| File | Change |
|------|--------|
| `src/components/AdminToolsPage.tsx` | Fix 1: Replace skeleton (lines 616-641). Fix 2: Persist collapsed state (lines 130-132 + new useEffect) |
| `src/hooks/useUserScopedFavorites.ts` | Fix 3: Legacy IDs removed instead of remapped (lines 25-34) |

### Not Built
- Rename `AI AGENT` to `AI AGENTS` — rejected, current singular label is intentional and all logic references it
- Build guard / version handshake in `main.tsx` — unnecessary; the real bugs are the skeleton and unpersisted state, not stale bundles
- `AuthenticatedLayout.tsx` hook-order fix — separate issue, not causing the admin page flash

