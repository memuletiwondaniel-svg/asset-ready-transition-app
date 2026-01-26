
# UI Refinements for VCR Systems Tab

## Overview
Make two styling adjustments to improve visual hierarchy in the system cards within the VCR overlay's Systems tab.

## Changes

### 1. Increase Spacing Between Progress Wheel and System Info
**Current:** `gap-4` (16px) between the circular progress wheel and the system info section
**Change:** Increase to `gap-6` (24px) for better visual separation

### 2. Mute the System ID Badge
**Current:** The System ID badge uses standard text styling that competes with the system name for attention
**Change:** Add muted styling to de-emphasize the System ID:
- Add `text-muted-foreground` to the badge text
- Add `border-muted` for a softer border color
- This ensures the system name remains the primary focus

---

## Technical Details

**File:** `src/components/p2a-workspace/handover-points/VCRSystemsTab.tsx`

**Line 215 - Increase gap:**
```tsx
// Before
<div className="flex items-center gap-4">

// After
<div className="flex items-center gap-6">
```

**Lines 222-224 - Mute System ID:**
```tsx
// Before
<Badge variant="outline" className="font-mono text-xs">
  {system.system_id}
</Badge>

// After
<Badge variant="outline" className="font-mono text-xs text-muted-foreground border-muted">
  {system.system_id}
</Badge>
```

## Visual Result
- The circular progress wheel will have more breathing room from the text content
- The System ID will appear as secondary information, allowing the system name to stand out as the primary identifier
