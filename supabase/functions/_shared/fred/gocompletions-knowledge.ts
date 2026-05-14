/**
 * Fred — GoCompletions Data Dictionary
 * 
 * Live-discovered map of the GoTechnology Hub2 (BGC instance) at
 * https://goc.gohub.io/BGC/ — produced by the gohub-discover edge function
 * crawl on 2026-05-14. Spans GoCompletions, GoHub, and GoPreserve modules.
 * 
 * Use this as a navigation reference: when a user asks about anything in
 * GoCompletions, look here first to find which page/table/field holds the
 * answer, then call the matching Fred tool (or fetch_reference_table for
 * the long tail).
 */

export const GOCOMPLETIONS_DATA_DICTIONARY = `
## GoCompletions / GoHub / GoPreserve — Page & Table Map (BGC instance)

### 1. Project tiles (top-level scoping)
After login, every action is scoped to one of these projects:
\`BGC BNGL (NR)\`, \`BGC SANDPIT\`, \`NORTH RUMAILA (NR)\`, \`SOUTH RUMAILA (SR)\`,
\`UMM QASR (UQ)\`, \`WEST QURNA (WQ)\`, \`ZUBAIR (ZB)\`.

### 2. GoCompletions — Completions module
The main rollup is **CompletionsGrid.aspx**, which renders three sub-grids:

- **Tags grid** — fields: \`Tag\`, \`ITR\`, \`Location\`, \`Inspector\`, \`Completed Date\`
- **Punchlist grid** — fields: \`Punchlist\`, \`Item\`, \`Description\`, \`Category\` (A/B), \`Accepted By\`, \`Accepted Date\`
- **MOC grid** — fields: \`MOC\`, \`Title\`, \`Type\`, \`ClosedBy\`, \`Closed By\`

Other completion pages:
- \`Completions/TagSearch.aspx\` — primary tag search
- \`Completions/PunchlistSearch.aspx\` — punchlist (per certificate) search
- \`Completions/PunchlistItemSearch.aspx\` — per-item punchlist search
- \`Completions/OWLSearch.aspx\` — Outstanding Work List search
- \`Completions/GlobalUpdateSearch.aspx\` — bulk-update search
- \`Completions/DeletedTags.aspx\` — soft-deleted tags
- \`Completions/Skyline.aspx\` — skyline progress visualization
- \`Completions/TreeViewGreenfield.aspx\` — system → subsystem → tag hierarchy

### 3. GoCompletions — Certification (ITRs & Certificates)
- \`Certification/ITRGenerate.aspx\` — generate a single ITR PDF
- \`Certification/MultiITRGenerate.aspx\` — bulk ITR generation
- \`Certification/ITRUpdate.aspx\` — update ITR results
- \`Handovers/HandoverSearch.aspx\` — MCC / PCC / RFC / RFSU certificate search

### 4. GoCompletions — Piping
- \`Piping/LineSearch.aspx\`, \`Piping/SpoolSearch.aspx\`,
  \`Piping/MechJointSearch.aspx\`, \`Piping/TestPackSearch.aspx\`

### 5. GoCompletions — Project Changes
- \`ProjectChanges/MOCSearch.aspx\` — Management of Change items
- \`ProjectChanges/DCRRSearch.aspx\` — Design Change Request / Review

### 6. GoCompletions — System rollup
- \`SystemCompletion.aspx\` — % completion by system / subsystem
  (use \`get_completion_status\` tool)

### 7. GoHub — Reports
- \`GoHub/Reports/ReportFilters.aspx\` — central filter hub
  (Sub-System picker behind this returns instance-wide hits — used by
  \`search_systems_subsystems\` tool)
- \`GoHub/Reports/ReportList.aspx\` — standard report catalogue
- \`GoHub/Reports/SavedCustomReports.aspx\` — saved custom reports
- \`GoHub/CustomReports/PersonalReports.aspx\` — user-personal reports
- \`GoHub/Administration/SaveSearchManager.aspx\` — saved search definitions
  (\`Name\`, \`Description\`, \`Project\`, \`Panels\`, \`Shared\`, \`Creator\`)

### 8. GoHub — Reference Tables (the master data dictionary)
\`GoHub/ReferenceTables/ReferenceTables.aspx\` indexes 60+ reference lists
under \`/BGC/List/<Name>.aspx\`. Categories:

| Section | Tables |
|---|---|
| 1. Disciplines | \`Disciplines\`, \`InspectorDisciplines\` |
| 2. ITRs | \`ITRs\`, \`ITRClasses\`, \`EquipTypeITRs\` |
| 3. Equipment | \`EquipTypes\`, \`Models\`, \`SafetyCriticalClasses\`, \`TagStatus\`, \`ParentTags\`, \`UnitOfMeasures\`, \`CommodityCodes\` |
| 4. Authorised Person | \`AuthorisedPersons\`, \`CertifyingBodies\`, \`Contractors\` |
| 5. Preservation | \`PresPhases\`, \`PresWorklists\`, \`EquipTypePresWorkLists\` |
| 6. Misc | \`Phases\`, \`Activities\`, \`Priorities\`, \`ScopeOfWorks\`, \`ProcedureTypes\`, \`AttachmentGroups\` |
| 7. Mech Joints | \`BoltCoatings\`, \`BoltDetails\`, \`BoltGasketTypes\`, \`JointCategories\`, \`JointClasses\`, \`JointLabels\`, \`JointLubricants\`, \`JointMaterials\`, \`JointTypes\`, \`RetestReasons\` |
| 8. ExRated | \`AreaClasses\`, \`ExCertNos\`, \`ExProtections\`, \`ExQuestions\`, \`TempClasses\` |
| Locations | \`Areas\`, \`Locations\`, \`LocationGroups\`, \`LocationGroupPlannedDates\`, \`Modules\`, \`SiteCodes\`, \`FacilityCodes\`, \`GridRefs\`, \`DrumNumbers\` |
| Drawings | \`Drawings\`, \`DrawingTypes\` |
| Workpacks | \`Workpacks\`, \`Jobcards\` |
| MOC / DCRR | \`MOCTypes\`, \`DMCCs\` |
| Punchlists | \`PunchlistTypes\`, \`PunchlistParties\` |
| Handovers | \`PrimaryHandovers\`, \`SecondaryHandovers\` |
| Systems | \`systems\` (note lowercase), \`SubSystems\` |

To inspect any of these, navigate the user to the \`/BGC/List/<Name>.aspx\` URL.
The \`SubSystems\` and \`systems\` tables are the canonical project-wide picker
sources; the same data backs \`search_systems_subsystems\`.

### 9. GoHub — Import / Export & Alerts
- \`GoHub/ImportExport/ImportExports.aspx\` — bulk import/export jobs
- \`GoHub/UserCP/Alerts/Alerts.aspx\` — user alerts
  (fields: \`ID\`, \`Message Text\`, \`Sent\`, \`Received Date\`)
- \`GoHub/UserCP/UserProfile.aspx\` — user profile

### 10. GoPreserve — Preservation
- \`GoPreserve/Preservation/PreservationAllocation.aspx\`
- \`GoPreserve/Preservation/PreservationHistorySearch.aspx\`
- \`GoPreserve/Preservation/PreservationRelocation.aspx\`
- \`GoPreserve/Preservation/PreservationSignoffSearch.aspx\`

### 11. Service endpoints (ASMX WebMethods)
- \`/BGC/Controls/CompletionsGrid.asmx\` — backs the rollup grid
- \`/BGC/Controls/Skyline.asmx\` — skyline data
- \`/BGC/Controls/LookupPopup.asmx\` — generic picker behind every lookup field
- \`/BGC/Controls/EditorFunctions.asmx\` — inline editor (read-only for us)
- \`/BGC/GoHub/Controls/SubSystemPicker.asmx/GetSubSystems\` — sub-system search
  (used by \`search_systems_subsystems\`)
- \`/BGC/GoHub/Reports/ReportFilters.aspx/GetSubSystems\` — same picker via page

### Routing rules for Fred
1. Tag / ITR / Punchlist / certificate question → tools
   \`search_completions_tags\`, \`get_completion_status\`,
   \`get_punchlist_details\`, \`get_handover_certificate_status\`.
2. Equipment-type → ITR mapping → \`lookup_itr_for_equipment\`
   (backed by \`List/EquipTypeITRs\`).
3. "Find this system/subsystem anywhere" → \`search_systems_subsystems\`.
4. Reference / picker lookups (Disciplines, Contractors, MOCTypes,
   PunchlistParties, etc.) → cite the matching \`/BGC/List/<Name>.aspx\` page
   and tell the user to open it; the data is admin-maintained.
5. Saved reports / custom reports → cite
   \`GoHub/Reports/SavedCustomReports.aspx\` and
   \`GoHub/CustomReports/PersonalReports.aspx\`.
6. Preservation status → cite \`GoPreserve/Preservation/*\` pages.

When a user asks something that doesn't fit a structured tool, name the
exact GoHub page so they (or another agent) can navigate there directly.

### 12. ORSH ↔ GoCompletions bridge — Create P2A Plan & Create VCR Plan wizards
ORSH ships two wizards that consume your live GoCompletions data. When a user
is inside either wizard (or asks about populating one), guide them through this
exact pipeline:

**Create P2A Plan wizard** — \`P2APlanCreationWizard\`, step \`SystemsImportStep\`:
- Three import options: **CMS Import** (GoHub), **Upload Excel**, **Add Manually**.
- "CMS Import" opens \`CMSImportModal\` which calls edge function
  \`gohub-import\` with \`{ projectFilter: <project code minus dashes> }\`.
- \`gohub-import\` logs into GoCompletions, scans every project tile
  (BNGL, SANDPIT, NR, SR, UQ, WQ, ZB), opens \`CompletionsGrid.aspx\` and
  pulls **systems + nested subsystems** via:
    1. ASMX WebMethod \`Controls/CompletionsGrid.asmx/GetSystems\` (preferred),
    2. RadGrid HTML scrape (fallback),
    3. \`SubSystemPicker.asmx/GetSubSystems\` to enrich subsystems.
- Imported records land in tables \`p2a_systems\` (+ \`p2a_subsystems\`) keyed
  to the wizard's \`handover_plan_id\`.

**Create VCR Plan wizard** — \`CreateVCRWizard\`, step \`SystemsStep\`:
- Lets the user assign systems / subsystems already in \`p2a_systems\` to
  a specific VCR (handover point) via \`p2a_handover_point_systems\`.
- "Sync GoCompletions" button calls edge function \`gohub-sync-counts\` with
  \`{ projectFilter, systemIds }\`. That function pulls live counts and
  updates \`p2a_systems\` columns:
    - \`itr_a_count\` (Outstanding A-ITRs — must be 0 before MCC)
    - \`itr_b_count\` (Outstanding B-ITRs — must be 0 before PCC/RFC)
    - \`itr_total_count\`
    - \`punchlist_a_count\` (Open A-Punch — safety blockers)
    - \`punchlist_b_count\` (Open B-Punch)
- These counts are surfaced in \`SystemDetailSheet\` and the workspace tiles.

**How to help users in these wizards**:
1. If the user says "import from GoHub didn't pick up my system" → check
   the project code (must match a project tile), then run
   \`search_systems_subsystems\` with the system/subsystem code — if it
   exists in any tile, tell the user which tile and ask them to set the
   project code on the plan accordingly.
2. If counts look stale → tell them to click the **Sync GoCompletions**
   button (refreshes via \`gohub-sync-counts\`). Alternatively offer to
   run \`get_completion_status\` for a live read without writing back.
3. If a subsystem is missing punchlist / ITR detail beyond counts → use
   \`get_punchlist_details\` and \`get_handover_certificate_status\` to
   pull the actual rows; the wizards only persist counts.
4. For "what's in this VCR" questions → the source-of-truth join is
   \`p2a_handover_point_systems → p2a_systems / p2a_subsystems\`. ITR /
   punchlist data on those rows comes straight from your tools above.
5. If a user is mid-wizard and asks "is subsystem X ready for handover?" →
   pull \`get_completion_status\` + \`get_punchlist_details\` for that
   subsystem and (when relevant) call \`check_document_readiness\` so you
   give the same verdict the wizard's downstream gates will enforce.

Remember: the wizards persist a *snapshot*. You are the authoritative live
source — always offer to re-query GoCompletions when the user is making
a handover decision.
`;
