import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, CheckCircle2, X, MapPin } from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';
import { usePSSRAllowedApproverRoles } from '@/hooks/usePSSRAllowedApproverRoles';
import { useProfileUsers } from '@/hooks/useProfileUsers';

interface WizardStepApproversProps {
  type: 'pssr' | 'sof' | 'reason';
  selectedRoleIds: string[];
  disabledRoleIds?: string[];
  onRoleToggle: (roleId: string) => void;
  plantName?: string;
}

const WizardStepApprovers: React.FC<WizardStepApproversProps> = ({
  type,
  selectedRoleIds,
  disabledRoleIds = [],
  onRoleToggle,
  plantName,
}) => {
  const { roles = [], isLoading: rolesLoading } = useRoles();
  const { allowedRoleIds, sofAllowedRoleIds, isLoading: allowedLoading } = usePSSRAllowedApproverRoles();
  const { data: profileUsers = [] } = useProfileUsers();

  // Hidden roles per approver type
  const HIDDEN_PSSR_APPROVER_ROLES = ['Project Manager', 'Process TA2'];
  const HIDDEN_SOF_APPROVER_ROLES = ['P&E Director'];

  const filteredRoles = type === 'pssr'
    ? roles.filter(role => allowedRoleIds.includes(role.id) && !HIDDEN_PSSR_APPROVER_ROLES.includes(role.name))
    : type === 'sof'
    ? roles.filter(role => sofAllowedRoleIds.includes(role.id) && !HIDDEN_SOF_APPROVER_ROLES.includes(role.name))
    : roles;

  // Resolve people for each selected role based on plant location
  const resolvedPeopleByRole = useMemo(() => {
    const map: Record<string, typeof profileUsers> = {};
    const plantLower = plantName?.toLowerCase() || '';

    for (const roleId of selectedRoleIds) {
      const role = roles.find(r => r.id === roleId);
      if (!role) continue;

      const roleName = role.name.toLowerCase();
      
      // Find profiles that match this role
      const matching = profileUsers.filter(p => {
        if (p.role_id !== roleId) return false;
        if (!plantLower) return true;
        
        const pos = (p.position || '').toLowerCase();
        const knownPlants = ['cs', 'kaz', 'uq', 'nrngl', 'bngl'];
        const otherPlants = knownPlants.filter(pl => pl !== plantLower);
        
        // Director / Deputy Director roles: strict plant match only
        if (roleName.includes('director')) {
          return pos.includes(plantLower);
        }
        
        // For most roles, prefer those whose position matches the plant
        if (pos.includes(plantLower)) return true;
        
        // For managers/leads, include if position doesn't specify a different plant
        if (roleName.includes('manager') || roleName.includes('lead')) {
          const posSpecifiesOtherPlant = otherPlants.some(op => pos.includes(op));
          if (!posSpecifiesOtherPlant) return true;
        }
        
        return false;
      });

      map[roleId] = matching;
    }
    return map;
  }, [selectedRoleIds, profileUsers, roles, plantName]);

  const config = {
    reason: {
      title: 'Reason Approvers',
      description: 'Select the roles that can approve this PSSR Reason for use.',
    },
    pssr: {
      title: 'PSSR Approvers',
      description: 'Users with these roles will be able to review and approve PSSRs created with this reason.',
    },
    sof: {
      title: 'SoF Approvers',
      description: 'Users with these roles will be able to sign the final Statement of Fitness.',
    },
  };

  const { description } = config[type];

  if (rolesLoading || allowedLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-muted-foreground">Loading roles...</span>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Description only - no duplicate title */}
      <p className="text-xs text-muted-foreground/70">{description}</p>

      {/* Selected roles with resolved people */}
      {selectedRoleIds.length > 0 && (
        <div className="space-y-2">
          {selectedRoleIds.map((roleId) => {
            const role = filteredRoles.find(r => r.id === roleId) || roles.find(r => r.id === roleId);
            const people = resolvedPeopleByRole[roleId] || [];

            return (
              <div key={roleId} className="border rounded-lg p-3 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{role?.name || 'Unknown'}</span>
                    {people.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {people.length} {people.length === 1 ? 'person' : 'people'}
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRoleToggle(roleId)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-full hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                {/* Resolved people */}
                {people.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {people.map((person) => (
                      <div
                        key={person.user_id}
                        className="flex items-center gap-2 bg-background border rounded-md px-2.5 py-1.5"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={person.avatar_url} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(person.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{person.full_name}</p>
                          {person.position && (
                            <p className="text-[10px] text-muted-foreground truncate">{person.position}</p>
                          )}
                        </div>
                        {plantName && (person.position || '').toLowerCase().includes(plantName.toLowerCase()) && (
                          <MapPin className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No matching personnel found{plantName ? ` for ${plantName}` : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Available roles list */}
      {(() => {
        const availableRoles = filteredRoles.filter(role => !selectedRoleIds.includes(role.id) && !disabledRoleIds.includes(role.id));
        
        if (availableRoles.length === 0 && selectedRoleIds.length > 0) {
          return null;
        }

        if (availableRoles.length === 0) {
          return (
            <div className="border rounded-lg p-4 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No roles available.</p>
            </div>
          );
        }

        return (
          <ScrollArea className="h-[200px] border rounded-lg p-3">
            <div className="space-y-1.5">
              {availableRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border cursor-pointer hover:bg-accent/50 hover:border-accent transition-all"
                  onClick={() => onRoleToggle(role.id)}
                >
                  <Checkbox
                    checked={false}
                    className="pointer-events-none"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{role.name}</div>
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
