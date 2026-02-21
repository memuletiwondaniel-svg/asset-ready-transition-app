
## VCR Navigate Panel Fix

### Problem
When clicking a VCR in the P2A Handover Workspace, the system opens `VCRDetailSheet` -- a simple side panel for system assignment. The full `VCRDetailOverlay` component (which already has the correct two-section navigation with "Navigate" and "Building Blocks") exists in the codebase but is never used by the workspace.

### Solution
Replace the `VCRDetailSheet` usage in `P2AHandoverWorkspace.tsx` with `VCRDetailOverlay`, which already contains the correct layout:

**Section 1 - Navigate:**
- VCR Overview (default)
- Qualifications
- Comments
- SoF Certificate
- PAC Certificate

**Section 2 - Building Blocks:**
- Systems
- Checklist
- Training
- Procedures
- Documentation
- CMMS
- Spares
- Operational Registers

### Technical Details

**File: `src/components/p2a-workspace/P2AHandoverWorkspace.tsx`**

1. Change the import from `VCRDetailSheet` to `VCRDetailOverlay`
2. Replace the `<VCRDetailSheet .../>` component (lines 677-691) with `<VCRDetailOverlay />`, passing `handoverPoint`, `open`, `onOpenChange`, `onDelete`, and `isDeleting` props

This is a minimal change -- the `VCRDetailOverlay` component already has all the correct navigation structure, tabs, and content rendering built in.
