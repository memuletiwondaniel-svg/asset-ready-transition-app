

# VCR Relationship Feature: Drop VCR on VCR Interaction

## Overview

When a user drops one VCR onto another VCR in the P2A Handover Workspace, an overlay dialog will appear offering three relationship options:
1. **Prerequisite**: The dropped VCR must be completed before the target VCR
2. **Dependent**: The target VCR can only be completed when the dropped VCR is completed  
3. **Combine**: Merge both VCRs into a single new VCR with a user-provided name and auto-generated ID

---

## User Experience Flow

```text
+------------------+       Drop VCR-004        +------------------+
|     VCR-004      | -----------------------> |     VCR-001      |
|  "Water System"  |                          |  "Power System"  |
+------------------+                          +------------------+
                                                      |
                                                      v
                              +--------------------------------+
                              |    VCR Relationship Dialog     |
                              |--------------------------------|
                              |  What would you like to do?    |
                              |                                |
                              |  ( ) Prerequisite              |
                              |      VCR-004 must complete     |
                              |      before VCR-001            |
                              |                                |
                              |  ( ) Dependent                 |
                              |      VCR-001 can only complete |
                              |      when VCR-004 is done      |
                              |                                |
                              |  ( ) Combine                   |
                              |      Merge into single VCR     |
                              |                                |
                              |  [Cancel]  [Confirm]           |
                              +--------------------------------+
                                             |
                         If "Combine" selected & confirmed
                                             v
                              +--------------------------------+
                              |      Name Combined VCR         |
                              |--------------------------------|
                              |  New VCR Name:                 |
                              |  [_________________________]   |
                              |                                |
                              |  New ID: VCR-XXX-DPYYY (auto)  |
                              |                                |
                              |  [Cancel]  [Create Combined]   |
                              +--------------------------------+
```

---

## Technical Implementation

### 1. Database Schema (New Table)

A new table `p2a_vcr_relationships` will store inter-VCR dependencies:

```sql
CREATE TABLE public.p2a_vcr_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_vcr_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  target_vcr_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('PREREQUISITE', 'DEPENDENT')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate relationships
  UNIQUE(source_vcr_id, target_vcr_id, relationship_type)
);

-- Enable RLS
ALTER TABLE public.p2a_vcr_relationships ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
CREATE POLICY "Authenticated users can manage VCR relationships"
  ON public.p2a_vcr_relationships
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

### 2. New React Components

#### a. VCR Relationship Dialog Component
**File:** `src/components/p2a-workspace/handover-points/VCRRelationshipDialog.tsx`

A new dialog component that:
- Displays both VCR names/codes clearly
- Offers radio button selection for relationship type
- Shows contextual descriptions for each option
- Handles the "Combine" flow with a secondary name input step

#### b. Combine VCR Name Input (within same dialog)
- Conditional rendering when "Combine" is selected
- Input field for new VCR name
- Display auto-generated VCR code preview

### 3. Hook Updates

#### a. New Hook: `useVCRRelationships`
**File:** `src/components/p2a-workspace/hooks/useVCRRelationships.ts`

```typescript
// Manages VCR relationships
export const useVCRRelationships = (handoverPlanId: string) => {
  // Query to fetch all relationships for the plan
  // Mutation to create a relationship (PREREQUISITE or DEPENDENT)
  // Mutation to delete a relationship
  
  return {
    relationships,
    createRelationship,
    deleteRelationship,
    isCreating,
  };
};
```

#### b. Update `useP2AHandoverPoints`
- Add a `combineVCRs` mutation that:
  1. Creates a new VCR with the provided name
  2. Migrates all systems from both source VCRs to the new VCR
  3. Migrates prerequisites, documents, training items to the new VCR
  4. Deletes the two original VCRs

### 4. Workspace Integration

#### a. Update `P2AHandoverWorkspace.tsx`

Modify the drag-end handler to detect VCR-on-VCR drops:

```typescript
// In handleDragEnd:
if (active.data.current?.type === 'vcr' && over.data.current?.type === 'vcr') {
  const sourceVCR = active.data.current.handoverPoint;
  const targetVCR = over.data.current.handoverPoint;
  
  // Don't open dialog if dropping on self
  if (sourceVCR.id !== targetVCR.id) {
    setVcrRelationshipContext({ source: sourceVCR, target: targetVCR });
    setShowVCRRelationshipDialog(true);
  }
  return; // Prevent position update
}
```

Add state management:
```typescript
const [showVCRRelationshipDialog, setShowVCRRelationshipDialog] = useState(false);
const [vcrRelationshipContext, setVcrRelationshipContext] = useState<{
  source: P2AHandoverPoint;
  target: P2AHandoverPoint;
} | null>(null);
```

### 5. Files to Create/Modify

| Action | File Path |
|--------|-----------|
| Create | `supabase/migrations/xxx_create_vcr_relationships.sql` |
| Create | `src/components/p2a-workspace/hooks/useVCRRelationships.ts` |
| Create | `src/components/p2a-workspace/handover-points/VCRRelationshipDialog.tsx` |
| Modify | `src/components/p2a-workspace/P2AHandoverWorkspace.tsx` |
| Modify | `src/components/p2a-workspace/hooks/useP2AHandoverPoints.ts` |
| Update | `src/integrations/supabase/types.ts` (auto-generated after migration) |

---

## Implementation Steps

### Step 1: Database Migration
Create the `p2a_vcr_relationships` table with proper foreign keys and RLS policies.

### Step 2: Create useVCRRelationships Hook
Build the React Query hook for managing VCR relationships with create/delete mutations.

### Step 3: Add combineVCRs Mutation
Extend `useP2AHandoverPoints` with a complex mutation that merges two VCRs:
- Creates new VCR with auto-generated code
- Transfers all associated data (systems, prerequisites, documents, training, procedures)
- Cleans up old VCRs

### Step 4: Create VCRRelationshipDialog Component
Build the dialog UI with:
- Radio group for relationship type selection
- Dynamic descriptions based on VCR names
- Conditional name input for "Combine" option
- Loading states during mutations

### Step 5: Integrate into Workspace
- Add new state variables for dialog visibility and context
- Modify `handleDragEnd` to intercept VCR-on-VCR drops
- Render the new dialog component
- Connect callbacks to the appropriate mutations

---

## Visual Design

The dialog will follow existing patterns:
- Use the standard `Dialog` component from `@/components/ui/dialog`
- Radio group with `@/components/ui/radio-group`
- Input field with `@/components/ui/input`
- Muted background boxes for VCR previews (matching CreateHandoverPointDialog style)
- Clear labeling with VCR codes displayed in monospace font

