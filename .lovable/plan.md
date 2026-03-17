
Goal: make Delivering Party role resolution truly project-context-aware so users only see candidates matching the project’s Portfolio/Region, Hub, Plant, Field/Unit, and Site context (including your DP300/Zubair examples).

1) Root-cause fixes
- Fix project context source in VCR wizard:
  - `VCRItemsStep` currently depends on `useParams().id`, which is often undefined when opened from `/my-tasks`.
  - Add a reliable fallback chain: route `projectId` → resolve from `vcrId` (`p2a_handover_points -> p2a_handover_plans -> project_id`).
- Fix candidate source mismatch:
  - Current “resolved users” logic partially filters fallback users, but not project-team sourced users.
  - Current Add popover uses `useProjectTeamSearch` (broad), not “selected role + location” candidates.

2) Build robust project location context (single source of truth)
- In `VCRItemsStep`, fetch once and pass to forms:
  - `region_id`, `hub_id`, `plant_id`, `station_id`
  - names for region/hub/plant/station
  - station’s `field_id` + field name
- Convert to normalized keyword sets used for matching:
  - portfolio keywords (north/central/south)
  - hub keywords (e.g., zubair, kaz, uq + mapped variants via `HUB_TO_REGION`)
  - plant/field/site keywords (e.g., CS, CS - Zubair, HM, etc.)

3) Upgrade matching logic (strict against wrong hubs, practical for real data)
- Extend `hubRegionMapping` utility with reusable helpers:
  - normalize location text
  - extract project location keywords
  - detect explicit location tokens in a profile position
  - `matchesProjectLocation(profile, context, roleAssignmentType)`
- Apply the same location predicate to:
  - project-team candidates
  - fallback profile candidates
  (so KAZ/UQ/NRNGL entries are filtered out for Zubair projects)
- Respect role assignment type using `roleAssignmentConfig`:
  - `Project Engr` / `Project Hub Lead` => portfolio + hub match
  - `ORA Engr` / `Snr. ORA Engr.` => portfolio match (and hub when present in text/fields)

4) Role-family resolution for ORA expectation
- Add role-family expansion before querying candidates:
  - selecting `ORA Engr.` includes `Snr. ORA Engr.` candidates (and vice versa)
- Keep output grouped by selected role in UI, but include equivalent senior/junior ORA profiles to match expected behavior.

5) Fix Delivering Party UI data flow
- In `EditItemForm`:
  - Use role+location-filtered resolved candidates for both:
    - the chips shown under selected role
    - Add popover candidate list
  - Remove dependence on broad `projectTeamMembers` for Add list.
- Apply same filtering approach in `AddItemForm` for consistency.

6) Files to update
- `src/components/widgets/vcr-wizard/steps/VCRItemsStep.tsx`
  - resolve projectId from vcr when route param missing
  - centralize project location context fetch
  - apply role+location filtering to all candidate paths
  - switch Add popover candidate source to filtered role candidates
- `src/utils/hubRegionMapping.ts`
  - add richer location-matching helpers
- `src/utils/roleAssignmentConfig.ts` (read/reuse existing exports, minimal additions only if needed)

7) Acceptance checks (aligned to your examples)
- DP300 (Central/Zubair):
  - Selecting `Project Engr` shows Zubair-matching profiles only; excludes NRNGL/UQ/KAZ names.
  - Selecting `ORA Engr` excludes North-only ORA profiles (e.g., Ahmed Kadhim, Beibit).
- Behavior works whether wizard is opened from project pages or from `/my-tasks`.
- Add popover is responsive and only lists valid candidates for selected role+project context.
