

## Modernize Approval Cards

### Changes to `ApprovalSetupStep.tsx`

1. **Remove numbered circles** -- Delete the `w-6 h-6 rounded-full` index indicator from each row.

2. **Use actual profile images** -- The avatar already uses `AvatarImage` with `approver?.user_avatar`, which pulls from the user's Supabase storage profile picture. It falls back to initials only when no image exists. The current code is correct -- profile photos will display automatically for users who have uploaded one.

3. **Remove the summary footer** -- Delete the "5 approvers in 2 phases. Estimated review time: 5-10 days" section at the bottom.

4. **Make cards more compact and modern** -- Reduce padding from `p-3` to `p-2.5`, tighten gaps, and use a subtle hover effect for a cleaner look.

### Technical Details

**File**: `src/components/widgets/p2a-wizard/steps/ApprovalSetupStep.tsx`

- Remove the numbered circle `div` (lines with `w-6 h-6 rounded-full bg-primary/10`)
- Remove the summary `div` at the bottom (`p-3 bg-muted/30 rounded-lg`)
- Reduce card padding and avatar size slightly for a tighter layout
- Add `hover:shadow-sm transition-shadow` for modern interactivity feel
- Avatar images are already wired up via `user_avatar` field from team data -- no changes needed there

