

## Add "Open in Assai" under Download & Modernize Quick Actions Layout

### What's changing

Currently the three actions (Read & Analyse, Download, Open in Assai) are flat, equally-weighted chips. The user wants **Download** and **Open in Assai** grouped together as a secondary pair, with a more modern visual hierarchy.

### Design

Reorganize `DocumentQuickActions` into two visual tiers:

1. **Primary action** — "Read & Analyse" as a filled/solid chip (bg-primary, white text) to signal it's the main CTA
2. **Secondary group** — "Download" and "Open in Assai" stacked or grouped together with a subtle shared container, both as outlined chips. "Open in Assai" sits directly under/beside "Download" with a small `ExternalLink` icon, making them feel like related "get the file" actions.

### Layout concept

```text
┌─────────────────────────────────────────────────┐
│ For: Installation Operation Maintenance Manual   │
│                                                  │
│ [■ Read & Analyse]   [ ↓ Download  |  ↗ Assai ] │
└─────────────────────────────────────────────────┘
```

The Download + Assai pair share a split-button style border (single rounded container with a divider), giving them a modern grouped feel while keeping Read & Analyse prominent.

### Implementation — `src/components/bob/StructuredResponse.tsx`

Replace the `DocumentQuickActions` component (lines 15-34):

- **Read & Analyse**: Solid primary chip (`bg-primary text-primary-foreground`)
- **Download | Open in Assai**: Combined split-button with a single outer border, thin divider between them. Both retain their individual click targets (Download → `assaiDownloadUrl`, Assai → `assaiDetailsUrl`). Uses `rounded-l-full` / `rounded-r-full` with a `border-r` divider.

```tsx
function DocumentQuickActions({ doc, onRead }) {
  const primaryClass = "inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all cursor-pointer shadow-sm";
  const splitBase = "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border bg-muted/30 hover:bg-muted/60 text-foreground font-medium transition-all cursor-pointer no-underline";

  return (
    <div className="mb-2">
      <p className="text-[10px] text-muted-foreground mb-1.5 truncate">
        For: <span className="font-medium">{toTitleCase(doc.title)}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {/* Primary CTA */}
        <button onClick={...} className={primaryClass}>
          <BookOpen /> Read & Analyse
        </button>
        {/* Split button group */}
        <div className="inline-flex rounded-full overflow-hidden border border-border shadow-sm">
          <a href={downloadUrl} className="...rounded-none border-r...">
            <Download /> Download
          </a>
          <a href={assaiUrl} className="...rounded-none...">
            <ExternalLink /> Open in Assai
          </a>
        </div>
      </div>
    </div>
  );
}
```

### Files to modify

| File | Change |
|------|--------|
| `src/components/bob/StructuredResponse.tsx` | Redesign `DocumentQuickActions` with primary CTA + split-button group |

