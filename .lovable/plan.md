
# VCR Detail Overlay Enhancement Plan

## Overview
Rebuild the VCR Detail Overlay modal with 4 comprehensive tabs, real data integration, and detailed drill-down capabilities. The overlay will be triggered when clicking any VCR card in the P2A Handover workspace.

## Architecture

```text
VCRDetailOverlay (Parent Modal)
+-- Tab 1: Overview
|   +-- VCR Identity (Name, ID, Description)
|   +-- Target Date with "X days to go"
|   +-- Overall Progress Summary
|       +-- Systems Readiness %
|       +-- Checklist Items %
|       +-- Training %
|       +-- Documentation %
|       +-- Procedures %
|       +-- CMMS %
+-- Tab 2: Checklist Items
|   +-- List of Prerequisites with status badges
|   +-- Click to open PrerequisiteDetailSheet (nested overlay)
|       +-- Summary & Description
|       +-- Status & Workflow
|       +-- Delivering/Receiving Party
|       +-- Evidence Attachments
|       +-- Comments History
+-- Tab 3: Qualifications
|   +-- List of all qualifications from this VCR
|   +-- Status filters (Draft, Submitted, Approved, Rejected)
|   +-- Click to open QualificationDetailSheet
|       +-- Reason & Mitigation
|       +-- Action Owner & Target Date
|       +-- Reviewer Comments
|       +-- Supporting Evidence
|       +-- Approval Status
+-- Tab 4: System Readiness
    +-- List of mapped systems
    +-- Per-system statistics:
        +-- RFO/RFSU Status
        +-- Outstanding ITR-A/B counts
        +-- Outstanding Punchlist A/B counts
    +-- Click to view Punchlist details
```

## Data Model Integration

### New Hooks to Create

1. **useVCRPrerequisites(handoverPointId)**
   - Fetches from `p2a_vcr_prerequisites` table
   - Joins evidence from `p2a_vcr_evidence`
   - Returns prerequisites with status and attached evidence

2. **useVCRQualifications(handoverPointId)**
   - Fetches qualifications via prerequisites
   - Query path: `p2a_vcr_prerequisites` -> `p2a_vcr_qualifications`
   - Includes reviewer info and approval status

3. **useVCRSystemsReadiness(handoverPointId)**
   - Extends existing `useHandoverPointSystems`
   - Includes full system stats (punchlist, ITR counts)
   - Can join subsystems for detailed breakdown

## Component Structure

### Files to Create

1. **`src/components/p2a-workspace/hooks/useVCRPrerequisites.ts`**
   - Hook for fetching and managing VCR prerequisites

2. **`src/components/p2a-workspace/hooks/useVCRQualifications.ts`**
   - Hook for fetching qualifications across prerequisites
   - Hook for consolidated project-level qualifications (for OWL integration)

3. **`src/components/p2a-workspace/handover-points/VCROverviewTab.tsx`**
   - Enhanced overview with progress breakdown by category
   - Days remaining countdown
   - Visual progress indicators

4. **`src/components/p2a-workspace/handover-points/VCRChecklistTab.tsx`**
   - Prerequisites list with clickable cards
   - Status badges matching the workflow statuses

5. **`src/components/p2a-workspace/handover-points/PrerequisiteDetailSheet.tsx`**
   - Detailed view of a single prerequisite
   - Evidence attachments with view/download
   - Comments and approval history

6. **`src/components/p2a-workspace/handover-points/VCRQualificationsTab.tsx`**
   - Qualifications list with filter/sort
   - Status-based categorization

7. **`src/components/p2a-workspace/handover-points/QualificationDetailSheet.tsx`**
   - Full qualification details
   - Reviewer comments and rejection reasons
   - Target closure tracking

8. **`src/components/p2a-workspace/handover-points/VCRSystemsTab.tsx`**
   - Systems list with readiness stats
   - Expandable punchlist details
   - ITR breakdown

### File to Modify

**`src/components/p2a-workspace/handover-points/VCRDetailOverlay.tsx`**
- Expand to 4 tabs
- Integrate new hooks for real data
- Add state for nested detail sheets

## Tab 1: Overview - Detailed Design

### Header Section
- VCR Name and VCR Code (e.g., VCR-001-DP300)
- Status badge (Pending/In Progress/Ready/Signed)
- Description text (if available)

### Target Date Card
- Large format date display
- Caption: "X days to go" (or "Overdue by X days" if past)
- Visual indicator (green/amber/red based on urgency)

### Overall Progress Grid (6 categories)
| Category | Source | Calculation |
|----------|--------|-------------|
| Systems Readiness | p2a_handover_point_systems -> p2a_systems | Avg completion_percentage |
| Checklist Items | p2a_vcr_prerequisites | % with status ACCEPTED |
| Training | p2a_vcr_prerequisites (category filter) | % complete in training category |
| Documentation | p2a_vcr_prerequisites (category filter) | % complete in docs category |
| Procedures | p2a_vcr_prerequisites (category filter) | % complete in procedures category |
| CMMS | p2a_vcr_prerequisites (category filter) | % complete in CMMS category |

## Tab 2: Checklist Items - Status Workflow

### Status Display Mapping
| Database Status | Display Label | Badge Color |
|-----------------|---------------|-------------|
| NOT_STARTED | Draft | Gray |
| IN_PROGRESS | In Progress | Amber |
| READY_FOR_REVIEW | Under Review | Blue |
| ACCEPTED | Approved | Green |
| REJECTED | Rejected | Red |
| QUALIFICATION_REQUESTED | Qualification Raised | Purple |
| QUALIFICATION_APPROVED | Qualified | Purple/Check |

### Prerequisite Card Layout
```text
+----------------------------------------------+
| #1 | [Status Badge]                          |
|    Summary text goes here...                  |
|    Delivering: Project -> Receiving: Ops      |
|                                    [View] btn |
+----------------------------------------------+
```

### PrerequisiteDetailSheet Content
- Summary and full description
- Status with timeline
- Delivering/Receiving party names
- Evidence section with file cards (from p2a_vcr_evidence)
- Comments section
- Action buttons (Mark Ready, Request Qualification, etc.)

## Tab 3: Qualifications - Status Workflow

### Qualification Status Mapping
| Database Status | Display Label | Badge Color |
|-----------------|---------------|-------------|
| PENDING | Under Review | Amber |
| APPROVED | Approved | Green |
| REJECTED | Rejected | Red |

*Note: "Draft" state would be when a prerequisite has status `QUALIFICATION_REQUESTED` but no qualification record exists yet - handle in UI logic*

### Qualification Card Layout
```text
+----------------------------------------------+
| PRQ-001 | [Status Badge]                     |
| Reason: Cannot complete due to...            |
| Owner: John Smith | Target: 15 Mar 2026      |
|                               [Details] btn   |
+----------------------------------------------+
```

### QualificationDetailSheet Content
- Linked prerequisite summary
- Reason (why cannot be completed)
- Mitigation (proposed alternative)
- Follow-up action
- Action owner and target date
- Reviewer comments (if reviewed)
- Rejection reason (if rejected)
- Evidence attachments

### OWL Integration
- Create a hook `useProjectQualifications(projectCode)` to fetch all qualifications across all VCRs for a project
- This consolidates qualifications for display on the OWL/Handover management pages

## Tab 4: System Readiness

### System Card Layout
```text
+----------------------------------------------+
| SYS-001 | Instrument Air System               |
|  RFO: [ACHIEVED]  |  RFSU: [IN PROGRESS]     |
|----------------------------------------------+
| Punchlist A: 5   | Punchlist B: 12           |
| ITR-A: 3         | ITR-B: 8                   |
|                            [View Details] btn |
+----------------------------------------------+
```

### Expandable Punchlist Details
When clicking "View Details" on a system:
- Show system detail overlay (existing SystemDetailOverlay.tsx)
- Or inline expandable section with:
  - Individual punchlist items (if tracked at item level)
  - ITR breakdown by status
  - Subsystem completions

### Aggregated Stats Header
- Total Systems: X
- RFO Achieved: Y/X
- RFSU Achieved: Z/X
- Total Outstanding Punchlists: A+B
- Total Outstanding ITRs: C+D

## Implementation Sequence

### Phase 1: Data Layer
1. Create `useVCRPrerequisites` hook
2. Create `useVCRQualifications` hook
3. Extend `useHandoverPointSystems` for full system stats

### Phase 2: Tab Components
4. Build VCROverviewTab with real data
5. Build VCRChecklistTab with prerequisite list
6. Build VCRQualificationsTab with qualifications list
7. Build VCRSystemsTab with system readiness cards

### Phase 3: Detail Sheets
8. Build PrerequisiteDetailSheet with evidence viewer
9. Build QualificationDetailSheet with approval flow

### Phase 4: Integration
10. Refactor VCRDetailOverlay.tsx to use new components
11. Wire up all state management and nested overlays

### Phase 5: OWL Integration
12. Create useProjectQualifications hook
13. Add qualifications section to OWLManagementTab

## Technical Considerations

### State Management
- Use sheet/drawer pattern for nested detail views (Radix Sheet)
- Maintain parent dialog open while sheet is displayed
- Pass callbacks for status updates back to parent

### Performance
- Lazy load tab content only when tab is active
- Use React Query for caching and deduplication
- Implement skeleton loading states per section

### Responsive Design
- Stack progress cards on mobile
- Collapsible sections for details
- Scrollable content within fixed dialog height

### Accessibility
- ARIA labels for status badges
- Keyboard navigation for tabs
- Focus management for nested overlays
