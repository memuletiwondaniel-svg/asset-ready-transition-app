/**
 * Single-select portfolio (region) assignment field.
 *
 * A portfolio role (Snr ORA Engr, Construction Lead, Commissioning Lead,
 * ORA Engr, Project Manager) is held for EXACTLY ONE portfolio at a time
 * — North OR Central OR South. Selecting a different portfolio moves
 * (reassigns) the user; it never leaves them in two.
 *
 * Writes to `region_role_holders` (NOT profiles.position, NOT
 * project_team_members). Resolution is live-read so the change
 * propagates to every project in the chosen portfolio immediately.
 */
import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { useAvailableRegions } from '@/hooks/usePortfolioRoleHolders';

export interface PortfolioAssignmentFieldProps {
  /** Display label for the role (e.g. "Snr ORA Engr"). */
  roleName: string;
  /** Currently-selected region ID (controlled). null = unassigned. */
  selectedRegionId: string | null;
  /** Called with the new region ID (or null to clear). */
  onChange: (regionId: string | null) => void;
  /** Disable interaction (e.g. when not in edit mode). */
  disabled?: boolean;
}

export const PortfolioAssignmentField: React.FC<PortfolioAssignmentFieldProps> = ({
  roleName,
  selectedRegionId,
  onChange,
  disabled = false,
}) => {
  const { data: regions, isLoading } = useAvailableRegions();

  const select = (regionId: string) => {
    if (disabled) return;
    // Re-clicking the active option clears it (reassign elsewhere by
    // picking another — never leaves the user in two portfolios).
    onChange(selectedRegionId === regionId ? null : regionId);
  };

  return (
    <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="flex-1">
          <Label className="text-sm font-semibold">
            Portfolio Assignment
            <Badge variant="outline" className="ml-2 font-normal">
              {roleName}
            </Badge>
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Select <span className="font-medium">one</span> portfolio. This
            user will be the canonical <span className="font-medium">{roleName}</span>
            {' '}for every project in the chosen portfolio — live-read, no
            per-project assignment needed. Switching portfolios reassigns
            the user.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading portfolios…</div>
      ) : (
        <div
          role="radiogroup"
          aria-label={`Portfolio for ${roleName}`}
          className="grid grid-cols-3 gap-3 pt-1"
        >
          {(regions ?? []).map((r) => {
            const checked = selectedRegionId === r.id;
            const id = `portfolio-${r.id}`;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={checked}
                key={r.id}
                id={id}
                disabled={disabled}
                onClick={() => select(r.id)}
                className={`flex items-center gap-2 rounded-md border p-3 text-left transition-colors ${
                  disabled
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-accent'
                } ${checked ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border'}`}
              >
                <span
                  aria-hidden
                  className={`h-4 w-4 rounded-full border ${
                    checked ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}
                />
                <span className="text-sm font-medium">{r.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {!selectedRegionId && !isLoading && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          No portfolio selected — this user will not be resolved as
          {' '}{roleName} on any project.
        </p>
      )}
    </div>
  );
};

export default PortfolioAssignmentField;
