

## Update P2A Handover Header and Add VCR Introduction

### Changes

**1. Remove the back arrow button (ManageHandover.tsx)**
- Remove the `Button` with `ArrowLeft` icon (lines 54-61) from the header
- Remove the `ArrowLeft` import from lucide-react
- The breadcrumb navigation already provides a way back, so the arrow is redundant

**2. Update the P2A Handover description (ManageHandover.tsx)**
- Change the subtitle from "Configure PAC, FAC, SoF certificates and OWL tracking" to "Configure the project-to-asset transition elements"

**3. Add VCR full title and intro sentence (VCRManagementTab.tsx)**
- Add a small header section above the sub-tabs with:
  - Title: "Verification Certificate of Readiness (VCR)"
  - One-line description: "A structured approach to manage and verify the project-to-asset transition, ensuring all systems are ready for operational handover."
- This provides context when the VCR tab is selected without adding heavy visual weight

### Files to Modify
- `src/components/handover/ManageHandover.tsx` -- remove back arrow, update description
- `src/components/handover/VCRManagementTab.tsx` -- add VCR title and intro text
