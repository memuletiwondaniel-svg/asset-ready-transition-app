import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock, Users, CheckCircle2 } from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';
import { usePSSRAllowedApproverRoles } from '@/hooks/usePSSRAllowedApproverRoles';

interface WizardStepApproversProps {
  type: 'pssr' | 'sof' | 'reason';
  selectedRoleIds: string[];
  disabledRoleIds?: string[];
  onRoleToggle: (roleId: string) => void;
}

const WizardStepApprovers: React.FC<WizardStepApproversProps> = ({
  type,
  selectedRoleIds,
  disabledRoleIds = [],
  onRoleToggle,
}) => {
  const { roles = [], isLoading: rolesLoading } = useRoles();
  const { allowedRoleIds, sofAllowedRoleIds, isLoading: allowedLoading } = usePSSRAllowedApproverRoles();

  // For PSSR approvers, filter to PSSR allowed roles
  // For SoF approvers, filter to SoF allowed roles
  const filteredRoles = type === 'pssr'
    ? roles.filter(role => allowedRoleIds.includes(role.id))
    : type === 'sof'
    ? roles.filter(role => sofAllowedRoleIds.includes(role.id))
    : roles;

  const config = {
    reason: {
      title: 'Reason Approvers',
      description: 'Select the roles that can approve this PSSR Reason for use (e.g., TSE Manager, ORA Lead, P&M Director).',
      infoMessage: 'Users with these roles will be able to approve the PSSR Reason before it becomes available for creating PSSRs.',
    },
    pssr: {
      title: 'PSSR Approvers',
      description: 'Select the roles that are authorized to approve PSSRs for this reason.',
      infoMessage: 'Users with these roles will be able to review and approve PSSRs created with this reason.',
    },
    sof: {
      title: 'SoF Approvers',
      description: 'Select the roles that are authorized to sign the Statement of Fitness for this reason.',
      infoMessage: 'Users with these roles will be able to sign the final Statement of Fitness. A role cannot be both a PSSR Approver and SoF Approver.',
    },
  };

  const { title, description, infoMessage } = config[type];

  if (rolesLoading || allowedLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-muted-foreground">Loading roles...</span>
      </div>
    );
  }

  // Multicolor badge palette for variety
  const badgeColorPalette = [
    'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 border-violet-300 dark:border-violet-700',
    'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700',
    'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700',
    'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-200 border-fuchsia-300 dark:border-fuchsia-700',
    'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700',
  ];

  const getBadgeColor = (index: number) => badgeColorPalette[index % badgeColorPalette.length];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <Label className="text-lg font-medium">{title}</Label>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Selected Summary - Above info alert */}
      <div className="p-3 rounded-lg border bg-muted/30 border-border">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Selected Roles</span>
          <span className="text-xs text-muted-foreground">({selectedRoleIds.length})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {selectedRoleIds.length === 0 ? (
            <span className="text-sm text-muted-foreground italic">No roles selected yet</span>
          ) : (
            selectedRoleIds.map((roleId, index) => {
              const role = filteredRoles.find(r => r.id === roleId) || roles.find(r => r.id === roleId);
              return (
                <Badge 
                  key={roleId} 
                  variant="outline" 
                  className={`text-xs border ${getBadgeColor(index)}`}
                >
                  {role?.name || 'Unknown'}
                </Badge>
              );
            })
          )}
        </div>
      </div>

      {/* Info hint */}
      <p className="text-xs text-muted-foreground">
        {infoMessage}
      </p>

      {/* Roles List */}
      <ScrollArea className="h-[280px] border rounded-lg p-4">
        <div className="space-y-2">
          {filteredRoles.map((role) => {
            const isSelected = selectedRoleIds.includes(role.id);
            const isDisabled = disabledRoleIds.includes(role.id);

            return (
              <div
                key={role.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${isDisabled 
                    ? 'opacity-50 cursor-not-allowed bg-muted/30 border-muted' 
                    : 'cursor-pointer hover:bg-accent/50 hover:border-accent'
                  }
                  ${isSelected && !isDisabled 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'border-border'
                  }
                `}
                onClick={() => !isDisabled && onRoleToggle(role.id)}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={isDisabled}
                  className="pointer-events-none"
                />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {role.name}
                    {isSelected && !isDisabled && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
                {isDisabled && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span>PSSR Approver</span>
                  </div>
                )}
              </div>
            );
          })}

          {filteredRoles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No roles available.</p>
              <p className="text-sm">Please create roles in the Admin Tools section.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default WizardStepApprovers;
