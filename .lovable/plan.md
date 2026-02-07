

# Compact Systems List in P2A Wizard

## Overview
Redesign the Systems step in the P2A Handover Plan wizard to show more systems in less space, with cleaner visuals and hover-to-reveal actions.

## Changes

### 1. Compact Import Options (SystemsImportStep.tsx)
- Remove the description text under each import button (e.g., "Connect to Completions System", "Spreadsheet", "Single entry")
- Keep just the icon and label in each card
- Reduce padding from `p-3` to `p-2`
- This frees up vertical space for the systems list

### 2. Increase Systems List Area (SystemsImportStep.tsx)
- Increase the ScrollArea height from `h-[200px]` to `h-[280px]` to accommodate ~5 visible system cards
- Increase the overall wizard dialog height from `h-[min(80vh,640px)]` to `h-[min(85vh,720px)]` in the parent wizard component

### 3. Redesign SystemListItem (SystemsImportStep.tsx)
- **Remove the Box icon** from the left side of each system card
- **Multicolor System ID labels**: Use the same HSL hash-based color approach from `ProjectIdBadge` to generate unique pastel badge colors per system ID. Create a small inline `getSystemIdColor` function that derives a hue from the system_id string, then render the system ID as a small colored badge (similar to project ID badges but at `text-[10px]` size)
- **Replace the Progress bar** with a simple colored percentage text (e.g., "78.5%" in the appropriate color -- green/yellow/orange/red)
- **Auto-hide Edit and Delete buttons**: Wrap both buttons in a container with `opacity-0 group-hover:opacity-100 transition-opacity` so they only appear on hover
- **Reduce card height**: Change padding from `p-3` to `py-1.5 px-2.5`, reduce gaps, use tighter typography
- **Add hover effect**: Add `hover:bg-muted/50` class to each system row and add the `group` class for the hover-to-reveal buttons

### 4. Update Wizard Dialog Height (P2APlanCreationWizard.tsx)
- Change `h-[min(80vh,640px)]` to `h-[min(85vh,720px)]` to give more room for content

## Technical Details

**Files to modify:**
1. `src/components/widgets/p2a-wizard/steps/SystemsImportStep.tsx` -- All system card and import option changes
2. `src/components/widgets/p2a-wizard/P2APlanCreationWizard.tsx` -- Dialog height increase

**System ID color generation (new helper in SystemsImportStep.tsx):**
```typescript
function getSystemIdColor(systemId: string) {
  const str = systemId.replace(/-/g, '').toUpperCase();
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  hash = Math.abs(hash);
  const hueAnchors = [165, 180, 200, 220, 250, 280, 320];
  const hue = hueAnchors[hash % hueAnchors.length] + (((hash >> 8) % 25) - 12);
  const sat = 30 + ((hash >> 12) % 15);
  const light = 50 + ((hash >> 16) % 12);
  return {
    bg: `hsl(${hue}, ${sat}%, ${light}%)`,
    bgLight: `hsl(${hue}, ${sat}%, 94%)`,
    border: `hsl(${hue}, ${sat}%, 80%)`,
  };
}
```

**Compact system card layout (non-editing mode):**
```text
+-----------------------------------------------+
| [SYS-001]  System Name          HC   82.5%  ...│
+-----------------------------------------------+
         ^           ^             ^     ^      ^
     colored ID    name         badge  progress  edit/delete
     badge                              text    (on hover)
```

**Compact import options:**
```text
+------------------+------------------+------------------+
|  [icon]          |  [icon]          |  [icon]          |
|  CMS Import      |  Upload Excel    |  Add Manually    |
+------------------+------------------+------------------+
```
(No description lines underneath each label)
