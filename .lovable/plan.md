

## SoF Approvers — Header and Inline "Add" Button Refinement

### Current state

- **Step 2 (PSSR)** has a styled section header: icon (blue `Users`) + "PSSR Approvers" label + description text, followed by role cards and a full-width dashed "Add Approver" button at the bottom.
- **Step 3 (SoF)** has no header — just a small muted description line (`text-xs text-muted-foreground/70`), then the role cards, then the same full-width dashed button.

The user asks two questions:
1. Should SoF get a matching header with icon?
2. Should "Add Approver" move inline with the header instead of being a separate row?

### UI/UX recommendation

**Yes to both.** The modern pattern is a **section header row** with the action button right-aligned on the same line. This:

- Reduces vertical space (eliminates a dedicated button row)
- Creates clear visual hierarchy — the header anchors the section, the action is discoverable but secondary
- Matches patterns seen in Notion, Linear, Figma, and most modern SaaS tools
- Keeps consistency across Step 2 and Step 3

The "Add Approver" becomes a **text button** (no border, blue/primary font, small `Plus` icon) right-aligned on the header row. The dashed full-width button is removed.

### Layout

```text
┌─────────────────────────────────────────────┐
│ 📋 SoF Approvers              + Add Approver│  ← header row
│ Users with these roles will be able to...   │  ← description
├─────────────────────────────────────────────┤
│ > HSE Director  [1]                         │  ← collapsible card
│ v Plant Director  [5]                       │  ← expanded card
│   [avatar chips...]                         │
└─────────────────────────────────────────────┘
```

Same treatment applied to Step 2's PSSR Approvers header for full consistency.

### Technical plan

**File: `src/components/pssr/wizard/WizardStepApprovers.tsx`**

1. **Add SoF header with icon** (replaces lines 309-311): Give `sof` type the same header treatment as `pssr` — a `FileCheck` icon in amber/orange + "SoF Approvers" label + description underneath.

2. **Move "Add Approver" inline with header** (for both `pssr` and `sof` types):
   - The header row becomes a `flex items-center justify-between` container.
   - Left side: icon + title label.
   - Right side: the "Add Approver" `Popover` trigger, styled as a ghost/link button with `text-primary text-sm font-medium` and a small `Plus` icon. Only shown when `availableRoles.length > 0`.
   - Remove the existing full-width dashed button block (lines 397-429).

3. **Keep `reason` type unchanged** — it uses a different layout context and doesn't need the inline pattern.

4. **Import `FileCheck`** from lucide-react for the SoF icon (or `ClipboardCheck` — `FileCheck` fits "Statement of Fitness" well).

### Changes summary

- Lines 296-311: Merge the `pssr` and `sof` header blocks into a unified section that renders for both types, with type-specific icon/title/description, and the "Add Approver" popover inlined on the right.
- Lines 397-429: Remove the standalone "Add Approver" button block (it moves into the header).
- Add `FileCheck` to the lucide imports.

