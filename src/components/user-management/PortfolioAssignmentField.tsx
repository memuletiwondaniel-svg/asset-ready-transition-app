/**
 * Multi-select portfolio (region) assignment field.
 *
 * Renders when the user's selected role has scope='portfolio'. Writes
 * directly to `region_role_holders` (NOT to profiles.position and NOT
 * to project_team_members). Resolution is live-read, so changes here
 * propagate to every project in the chosen portfolio(s) with no
 * per-project edits.
 *
 * Controlled by parent — selection state lives in the parent form so the
 * Save button can commit it together with the rest of the profile.
 */
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { useAvailableRegions } from '@/hooks/usePortfolioRoleHolders';

export interface PortfolioAssignmentFieldProps {
  /** Display label for the role (e.g. "Snr ORA Engr"). */
  roleName: string;
  /** Currently-selected region IDs (controlled). */
  selectedRegionIds: string[];
  /** Called with the new array of region IDs. */
  onChange: (regionIds: string[]) => void;
  /** Disable interaction (e.g. when not in edit mode). */
  disabled?: boolean;
}

export const PortfolioAssignmentField: React.FC<PortfolioAssignmentFieldProps> = ({
  roleName,
  selectedRegionIds,
  onChange,
  disabled = false,
}) => {
  const { data: regions, isLoading } = useAvailableRegions();

  const toggle = (regionId: string, checked: boolean) => {
    if (disabled) return;
    if (checked) {
      if (!selectedRegionIds.includes(regionId)) {
        onChange([...selectedRegionIds, regionId]);
      }
    } else {
      onChange(selectedRegionIds.filter((id) => id !== regionId));
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="flex-1">
          <Label className="text-sm font-semibold">
            Portfolio Assignments
            <Badge variant="outline" className="ml-2 font-normal">
              {roleName}
            </Badge>
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Select one or more portfolios. This user will be the canonical
            <span className="font-medium"> {roleName} </span>
            for every project in the chosen portfolio(s) — live-read, no
            per-project assignment needed.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading portfolios…</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 pt-1">
          {(regions ?? []).map((r) => {
            const checked = selectedRegionIds.includes(r.id);
            const id = `portfolio-${r.id}`;
            return (
              <label
                key={r.id}
                htmlFor={id}
                className={`flex items-center gap-2 rounded-md border p-3 transition-colors ${
                  disabled
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-accent'
                } ${checked ? 'border-primary bg-primary/10' : 'border-border'}`}
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(c) => toggle(r.id, c === true)}
                />
                <span className="text-sm font-medium">{r.name}</span>
              </label>
            );
          })}
        </div>
      )}

      {selectedRegionIds.length === 0 && !isLoading && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          No portfolios selected — this user will not be resolved as
          {' '}{roleName} on any project.
        </p>
      )}
    </div>
  );
};

export default PortfolioAssignmentField;
