

# Sidebar Modernization — Final Implementation Plan

All changes in **one file**: `src/components/sidebar/SidebarContent.tsx` (477 lines). No changes to `OrshSidebar.tsx`.

---

## Fix 1 — Remove GlossaryTerm completely

- **Line 16**: Remove `GlossaryTerm` import
- **Lines 71-78**: Delete the `sectionGlossaryTerm` map entirely
- **Lines 235-241**: Replace the conditional GlossaryTerm/span block with just `<span className="truncate">{getLabel(item.labelKey)}</span>`

This eliminates the dotted underline and question-mark cursor on all nav labels.

## Fix 2 — Two icon corrections

- **Line 9**: Add `ClipboardCheck` to import. Remove `AlertTriangle` and `CalendarCheck` only if unused elsewhere in the file (they are not used elsewhere — confirmed).
- **Line 83**: `icon: AlertTriangle` → `icon: ClipboardCheck`
- **Line 84**: `icon: CalendarCheck` → `icon: ListChecks`
- P2A Handover **keeps `Key`** — domain-correct.

## Change 1 — Typography

| Element | Current | New |
|---------|---------|-----|
| Nav labels (lines 226-229) | `text-sm` (implicit) | Add `text-xs font-medium` to button className |
| Section headers (lines 212, 301) | `text-xs font-semibold ... tracking-wide` | `text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/50` |
| User name (line 187) | `text-sm font-medium` | `text-sm font-semibold leading-tight` |
| User role (line 188) | `text-xs text-muted-foreground` | `text-[11px] text-muted-foreground/60 leading-tight` |

## Change 2 — Nav item dimensions

| Property | Current | New |
|----------|---------|-----|
| Expanded height (line 227) | `h-10 sm:h-9` | `h-8` |
| Collapsed height (line 272) | `h-9` | `h-8` |
| Collapsed spacing (line 260) | `space-y-2` | `space-y-1` |
| ScrollArea padding (line 208) | `px-2 sm:px-4` | `px-2` |
| Icon size, gap, expanded spacing | unchanged | unchanged |

## Change 3 — Fix variant conflict + pill active state

- **Lines 223, 268**: Change `variant={isActive ? "secondary" : "ghost"}` → `variant="ghost"` always
- Active styling applied purely via className:
  - Default: `text-muted-foreground/70`
  - Hover: `text-foreground bg-muted/50`
  - Active: `text-primary font-semibold bg-primary/10 rounded-lg`
- Add `transition-colors duration-150` to all nav buttons

## Change 4 — Settings buttons: outline → ghost

All settings buttons (lines 310-401): `variant="outline"` → `variant="ghost"`, `h-10 sm:h-9` → `h-8`, add `text-xs`

Affects: Admin Tools (310), Theme toggle (328), Notifications (348), Language (360), Take Tour (392)

## Change 5 — Logout button

- **Line 443**: `variant="outline"` → `variant="ghost"`
- **Line 446**: Replace `text-destructive hover:text-destructive` with `text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10`
- Height: `h-10 sm:h-9` → `h-8`

## Change 6 — User profile block hover state

- **Line 167**: Update profile button className to include `rounded-lg hover:bg-muted/40 transition-colors duration-150 cursor-pointer`

## Change 7 — Root div polish

- **Line 136**: Add to root `<div>`:
  ```
  select-none [&_button]:hover:!scale-100 [&_button]:active:!scale-100 [&_button]:active:!rotate-0 [&_svg]:stroke-[1.75]
  ```

## Change 8 — Footer buttons consistency

- Collapse button (line 459): `h-10 sm:h-9` → `h-8`
- Footer container (line 441): `p-2 sm:p-4` → `p-2`

---

## What does NOT change

- P2A Handover `Key` icon
- Icon library (Lucide), icon size (`h-4 w-4`)
- Sidebar width (`w-48`)
- Collapse/expand behavior
- Sidebar background, border, logo
- Routing or navigation logic
- "Executive Dashboard" label (translation system — separate task)
- Zero functional changes — CSS/Tailwind only

