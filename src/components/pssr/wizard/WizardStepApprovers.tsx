import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, CheckCircle2, X } from 'lucide-react';
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

  // Hidden roles per approver type
  const HIDDEN_PSSR_APPROVER_ROLES = ['Project Manager', 'Process TA2'];
  const HIDDEN_SOF_APPROVER_ROLES = ['P&E Director'];

  // For PSSR approvers, filter to PSSR allowed roles and exclude hidden
  // For SoF approvers, filter to SoF allowed roles and exclude hidden
  const filteredRoles = type === 'pssr'
    ? roles.filter(role => allowedRoleIds.includes(role.id) && !HIDDEN_PSSR_APPROVER_ROLES.includes(role.name))
    : type === 'sof'
    ? roles.filter(role => sofAllowedRoleIds.includes(role.id) && !HIDDEN_SOF_APPROVER_ROLES.includes(role.name))
    : roles;

  const config = {
    reason: {
      title: 'Reason Approvers',
      description: 'Select the roles that can approve this PSSR Reason for use (e.g., TSE Manager, ORA Lead, P&M Director).',
    },
    pssr: {
      title: 'PSSR Approvers',
      description: 'Users with these roles will be able to review and approve PSSRs created with this reason.',
    },
    sof: {
      title: 'SoF Approvers',
      description: 'Users with these roles will be able to sign the final Statement of Fitness. A role cannot be both a PSSR Approver and SoF Approver.',
    },
  };

  const { title, description } = config[type];

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
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <Label className="text-lg font-medium">{title}</Label>
        </div>
        <p className="text-xs text-muted-foreground/70">{description}</p>
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
                  className={`text-xs border pr-1 ${getBadgeColor(index)}`}
                >
                  {role?.name || 'Unknown'}
                  <button
                    type="button"
                    onClick={() => onRoleToggle(roleId)}
                    className="ml-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                  </button>
                </Badge>
              );
            })
          )}
        </div>
      </div>


      {/* Roles List - Only show unselected roles */}
      {(() => {
        const availableRoles = filteredRoles.filter(role => !selectedRoleIds.includes(role.id) && !disabledRoleIds.includes(role.id));
        
        if (availableRoles.length === 0 && selectedRoleIds.length > 0) {
          return (
            <div className="border rounded-lg p-4 text-center text-muted-foreground">
              <p className="text-sm">All available roles have been selected.</p>
            </div>
          );
        }

        if (availableRoles.length === 0) {
          return (
            <div className="border rounded-lg p-4 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No roles available.</p>
              <p className="text-sm">Please create roles in the Admin Tools section.</p>
            </div>
          );
        }

        return (
          <ScrollArea className="h-[280px] border rounded-lg p-4">
            <div className="space-y-2">
              {availableRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-accent/50 hover:border-accent transition-all"
                  onClick={() => onRoleToggle(role.id)}
                >
                  <Checkbox
                    checked={false}
                    className="pointer-events-none"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{role.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        );
      })()}
    </div>
  );
};

export default WizardStepApprovers;
