## Plan: Modern VCR Card Redesign (P2A Handover)

Rebuild `src/components/dashboard/VCRCard.tsx` to match the approved direction: title + doughnut on top, thin separator, metadata row (status pill + cert chips) below. Keep accent color per VCR (from `getVCRColor`) but only on the ring stroke, hover border, and a soft tinted footer — no full card background tints.

### Card structure

```text
┌─────────────────────────────────────────┐
│  VCR-01                          ╭──╮   │
│  Power & Utilities               │0%│   │   ← title + doughnut (color stroke)
│                                  ╰──╯   │
├─────────────────────────────────────────┤   ← thin separator
│  [Draft]                    [SoF][PAC]  │   ← soft tinted footer
└─────────────────────────────────────────┘
```

### Visual spec (per selected prototype)

- Card: `bg-card border border-border rounded-2xl shadow-sm`, hover lifts (`-translate-y-0.5`), hover border uses VCR accent, hover shadow `shadow-xl`, `transition-all duration-300`.
- Header zone (`p-5`): VCR-ID eyebrow (mono, `text-[10px]`, tracking-widest, muted), title (`text-xl font-bold`).
- Doughnut: 64px, stroke-width 5, neutral track + accent stroke, `stroke-linecap=round`. Percent label uses **JetBrains Mono `text-[13px] font-bold`** (slightly larger per user direction).
- Separator: `border-t border-border` (or accent-tinted on complete).
- Footer (`px-5 py-3.5`): subtle accent-tinted background (e.g., `bg-{accent}/5`), status pill on left, cert chips (SoF / PAC) on right.

### Status states

| State | Pill | Ring | Footer tint |
|-------|------|------|-------------|
| 0% Draft | neutral outline pill "Draft" | accent stroke at 0 | accent/5 |
| In progress | accent outline pill "In Progress" | accent stroke at % | accent/5 |
| 100% Complete | solid emerald pill "Finalized" | emerald ring full | emerald/5, emerald separator |

### Out of scope

- P2A Handover header, icon, column wrapper, "Add VCR" button, ORA Activities, `vcrColors.ts`, parent `PSSRSummaryWidget.tsx`.

### Technical notes

- Use design tokens (`bg-card`, `border-border`, `text-muted-foreground`) plus existing accent from `getVCRColor(vcr.shortCode)`.
- Fonts already loaded in project (Outfit / JetBrains Mono); add Google Fonts link to `index.html` if missing.
- No new dependencies, no schema changes.
