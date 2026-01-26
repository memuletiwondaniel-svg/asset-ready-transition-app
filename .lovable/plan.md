
# Fill the Empty Center of System Cards

## Problem
The current system card layout has a large empty space in the center. The System Info section (system ID badge + name) uses `flex-1` which stretches to fill available space, but only contains two small elements, leaving significant visual emptiness.

## Current Layout
```text
┌─────────────────────────────────────────────────────────────────────┐
│  [Progress]   [Badge: SYS-001]                    PL-A PL-B ITRs RFO │
│    Wheel      System Name                           2    5    8   ✓  │
│              (empty space here...)                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Proposed Solution
Add a **Hydrocarbon/Non-Hydrocarbon indicator** with an icon and label to the center section. This provides useful information while filling the visual gap.

### New Layout
```text
┌─────────────────────────────────────────────────────────────────────┐
│  [Progress]   [SYS-001] [In Progress]             PL-A PL-B ITRs RFO │
│    Wheel      System Name Here                      2    5    8   ✓  │
│               🔥 Hydrocarbon                                         │
└─────────────────────────────────────────────────────────────────────┘
```

The indicator will use:
- **Flame icon (orange)** for Hydrocarbon systems
- **Snowflake icon (blue)** for Non-Hydrocarbon systems

---

## Technical Implementation

**File:** `src/components/p2a-workspace/handover-points/VCRSystemsTab.tsx`

### Add Icons Import
Add `Flame` and `Snowflake` to the existing lucide-react imports.

### Modify System Info Section (Lines 219-233)
Add a third row below the system name showing the hydrocarbon status:

```tsx
{/* System Info */}
<div className="flex-1 min-w-0">
  <div className="flex items-center gap-2 mb-1">
    <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-muted">
      {system.system_id}
    </Badge>
    {system.completion_status !== 'NOT_STARTED' && (
      <Badge className={cn("text-[10px]", statusConfig.color)}>
        {statusConfig.label}
      </Badge>
    )}
  </div>
  
  <p className="text-sm font-medium text-foreground">{system.name}</p>
  
  {/* NEW: Hydrocarbon Indicator */}
  <div className="flex items-center gap-1.5 mt-1">
    {system.is_hydrocarbon ? (
      <>
        <Flame className="w-3 h-3 text-orange-500" />
        <span className="text-xs text-muted-foreground">Hydrocarbon</span>
      </>
    ) : (
      <>
        <Snowflake className="w-3 h-3 text-blue-500" />
        <span className="text-xs text-muted-foreground">Non-Hydrocarbon</span>
      </>
    )}
  </div>
</div>
```

## Benefits
- **Fills empty space** with meaningful content
- **Adds useful context** - users can quickly see system classification
- **Consistent with design** - uses the same icon pattern as the left panel SystemCard
- **Visual interest** - colored icons add subtle visual differentiation

