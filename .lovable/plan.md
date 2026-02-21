

## Maintenance Manager Plant Selection

### What This Changes
When creating a new user with **Function = Maintenance** and selecting one of the Maintenance Manager roles, a **Plant** dropdown will appear (just like Ops Manager). The **Position** field will auto-generate as `"{Role} - {Plant}"` (e.g., "Mtce Manager - BNGL", "Mtce Mgr. Elect - NRNGL").

### Affected Roles
- Mtce Manager
- Mtce Mgr. Elect
- Mtce Mgr. Instrument
- Mtce Mgr. Static
- Mtce Mgr. Rotating

### How It Works
1. User selects Function: **Maintenance**
2. User selects one of the Mtce Manager roles
3. A **Plant** dropdown appears with all plants (BNGL, KAZ, UQ, CS, NRNGL)
4. Position auto-generates: e.g., **"Mtce Manager - BNGL"**

---

### Technical Details

**1. New config file: `src/utils/mtceManagerConfig.ts`**
- Define the list of Mtce Manager roles that require plant selection
- Export an `isMtceManager()` helper function
- Export a `generateMtceManagerPosition(role, plant)` function returning `"{role} - {plant}"`
- Reuse the same plant list (BNGL, KAZ, UQ, CS, NRNGL) -- no sub-areas needed for Mtce roles

**2. Update `src/components/user-management/EnhancedCreateUserModal.tsx`**
- Import the new Mtce Manager helpers
- Add `mtce_manager_plant` to `FormData` interface and initial state
- In `generatePositionTitle()`: add a branch for Mtce Manager roles returning `"{role} - {plant}"`
- In `isTitleReady()`: add cases for Mtce Manager roles requiring `!!mtce_manager_plant`
- In `handleRoleChange()`: reset `mtce_manager_plant` along with other fields
- In the JSX (after the Ops Manager section around line 1073): add a conditional block that shows a Plant dropdown when a Mtce Manager role is selected
- In the review step: ensure generated position displays correctly

**3. Update `src/components/user-management/EnhancedUserDetailsModal.tsx`**
- Mirror the same changes for the Edit/View user modal so existing Mtce Manager users show their plant selection correctly and the position can be edited consistently
