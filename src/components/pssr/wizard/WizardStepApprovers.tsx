import React, { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Users, X, MapPin, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const { roles = [], isLoading: rolesLoading } = useRoles();
  const { allowedRoleIds, sofAllowedRoleIds, isLoading: allowedLoading } = usePSSRAllowedApproverRoles();
  const { data: profileUsers = [] } = useProfileUsers();

  // Hidden roles per approver type
  const HIDDEN_PSSR_APPROVER_ROLES = ['Project Manager', 'Process TA2'];
  const HIDDEN_SOF_APPROVER_ROLES = ['P&E Director'];

  // Company-wide roles that don't have plant-specific positions
  const COMPANY_WIDE_ROLES = ['hse director', 'p&m director', 'p&e director', 'mtce director', 'central mtce lead'];

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

        // Exclude "Projects" personnel from PSSR approvers (they are for VCRs only)
        if (pos.includes('project')) return false;
        
        // Company-wide director roles (HSE Director, P&M Director, etc.) - no plant filter
        if (COMPANY_WIDE_ROLES.includes(roleName)) {
          return true;
        }
        
        // Plant-specific director roles: strict plant match only
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

  const availableRoles = filteredRoles.filter(
    role => !selectedRoleIds.includes(role.id) && !disabledRoleIds.includes(role.id)
  );

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
              <div key={roleId} className="border rounded-lg p-3 bg-muted/50 dark:bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    <span className="font-semibold text-sm tracking-tight text-foreground/90">{role?.name || 'Unknown'}</span>
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
                            <p className="text-[10px] text-muted-foreground/50 truncate">{person.position}</p>
                          )}
                        </div>
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

      {/* Add Approver Button */}
      {availableRoles.length > 0 && (
        <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full border-dashed text-muted-foreground hover:text-foreground">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Approver
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search roles..." />
              <CommandList>
                <CommandEmpty>No roles found.</CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-y-auto">
                  {availableRoles.map((role) => (
                    <CommandItem
                      key={role.id}
                      value={role.name}
                      onSelect={() => {
                        onRoleToggle(role.id);
                        setAddPopoverOpen(false);
                      }}
                    >
                      <Users className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <span className="text-sm">{role.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default WizardStepApprovers;
