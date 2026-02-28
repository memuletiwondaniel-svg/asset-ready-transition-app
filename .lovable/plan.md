

## Plan: Rearrange sidebar navigation in widgets VCRDetailOverlay

### Changes

**1. Split `NAV_ITEMS` into two sections in `src/components/widgets/VCRDetailOverlay.tsx` (lines 79-90)**

Replace single `NAV_ITEMS` array with two arrays:

```typescript
const CORE_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'VCR', icon: BarChart3 },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'qualifications', label: 'Qualifications', icon: AlertTriangle },
  { id: 'sof', label: 'SoF', icon: Shield, locked: true },
  { id: 'pac', label: 'PAC', icon: Award, locked: true },
];

const DELIVERABLE_NAV_ITEMS: NavItem[] = [
  { id: 'systems', label: 'Systems', icon: Layers },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'procedures', label: 'Procedures', icon: BookOpen },
  { id: 'documentation', label: 'Documentation', icon: FileText },
  { id: 'cmms', label: 'CMMS', icon: Settings2 },
  { id: 'spares', label: 'Spares', icon: Package },
  { id: 'registers', label: 'Operational Registers', icon: FileText },
];
```

**2. Update sidebar rendering (lines 1970-2004)**

Replace the single `NAV_ITEMS.map` with two sections separated by a `Separator`:
- "Navigate" header → `CORE_NAV_ITEMS` (filtering SoF by `has_hydrocarbon`)
- Separator
- "VCR Deliverables" header → `DELIVERABLE_NAV_ITEMS`

Both use the same button rendering logic already in place.

**3. Add missing imports**

Add `MessageSquare`, `AlertTriangle` from lucide-react (if not already imported) and `Separator` from UI components.

### Files to modify
- `src/components/widgets/VCRDetailOverlay.tsx`

