import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Info, Users, CheckCircle2 } from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';

interface WizardStepApproversProps {
  type: 'pssr' | 'sof';
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
  const { roles = [], isLoading } = useRoles();

  const title = type === 'pssr' ? 'PSSR Approvers' : 'SoF Approvers';
  const description = type === 'pssr'
    ? 'Select the roles that are authorized to approve PSSRs for this reason.'
    : 'Select the roles that are authorized to sign the Statement of Fitness for this reason.';
  const infoMessage = type === 'pssr'
    ? 'Users with these roles will be able to review and approve PSSRs created with this reason.'
    : 'Users with these roles will be able to sign the final Statement of Fitness. A role cannot be both a PSSR Approver and SoF Approver.';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-muted-foreground">Loading roles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <Label className="text-lg font-medium">{title}</Label>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Info Alert */}
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
          {infoMessage}
        </AlertDescription>
      </Alert>

      {/* Roles List */}
      <ScrollArea className="h-[300px] border rounded-lg p-4">
        <div className="space-y-2">
          {roles.map((role) => {
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
                  {role.description && (
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  )}
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

          {roles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No roles available.</p>
              <p className="text-sm">Please create roles in the Admin Tools section.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Selected Summary */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <span className="text-sm font-medium">Selected Roles</span>
        <div className="flex flex-wrap gap-1">
          {selectedRoleIds.length === 0 ? (
            <span className="text-sm text-muted-foreground">None selected</span>
          ) : (
            selectedRoleIds.slice(0, 3).map((roleId) => {
              const role = roles.find(r => r.id === roleId);
              return (
                <Badge key={roleId} variant="secondary" className="text-xs">
                  {role?.name || 'Unknown'}
                </Badge>
              );
            })
          )}
          {selectedRoleIds.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{selectedRoleIds.length - 3} more
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default WizardStepApprovers;
