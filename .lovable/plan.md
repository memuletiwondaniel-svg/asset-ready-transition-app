

## Approver Cards → Avatar + Overlay Badge (Compact Style)

### Design

Replace the current bordered card grid with a compact, borderless layout where each approver is rendered as:

```text
  ┌──┐
  │🧑│🟢  Name Surname
  └──┘    Role Label
```

- **Avatar** (h-8 w-8) with a **status badge overlay** on the bottom-right corner:
  - ✅ Emerald dot/check for `APPROVED`
  - 🕐 Amber dot/clock for `PENDING`
  - ❌ Red dot/x for `REJECTED`
  - ⚠️ Gray dot for unassigned
- Badge: tiny circle (h-3.5 w-3.5) with white ring (`ring-2 ring-background`), positioned `absolute -bottom-0.5 -right-0.5`
- **Name** on first line (`text-xs font-medium`), **role** on second (`text-[10px] text-muted-foreground`)
- No card borders, no background — clean whitespace separation
- Keep the 3-column responsive grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) to fit all 5 approvers in one row on desktop
- Each cell: `flex items-center gap-2.5 py-2`

### Files to Edit

| File | Change |
|------|--------|
| `src/components/widgets/p2a-wizard/steps/WorkspacePreviewStep.tsx` | Replace approver card markup with avatar+overlay badge layout |
| `src/components/widgets/p2a-wizard/steps/ConfirmationStep.tsx` | Same compact layout for the confirmation step approvers list |

### Implementation Detail

Each approver cell becomes:
```tsx
<div className="flex items-center gap-2.5 py-2">
  <div className="relative shrink-0">
    <Avatar className="h-8 w-8">...</Avatar>
    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-background flex items-center justify-center bg-amber-500">
      <Clock className="h-2 w-2 text-white" />
    </span>
  </div>
  <div className="min-w-0">
    <p className="text-xs font-medium truncate">Name</p>
    <p className="text-[10px] text-muted-foreground truncate">Role</p>
  </div>
</div>
```

Badge colors: `bg-emerald-500` (approved), `bg-amber-500` (pending), `bg-destructive` (rejected), `bg-muted-foreground` (unassigned). Icons inside badge: `Check` (approved), `Clock` (pending), `X` (rejected), `AlertCircle` (unassigned) — all at `h-2 w-2 text-white`.

