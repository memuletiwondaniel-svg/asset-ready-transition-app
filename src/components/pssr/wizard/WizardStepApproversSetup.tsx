import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Users, RotateCcw, Sparkles, Check, ChevronsUpDown, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import WizardStepApprovers from './WizardStepApprovers';

const PSSR_LEAD_POSITION_KEYWORDS = ['Tech Safety', 'Asset', 'Operations', 'Maintenance', 'MTCE'];

interface WizardStepApproversSetupProps {
  // PSSR Lead
  pssrLeadId: string;
  onPssrLeadChange: (userId: string) => void;

  // PSSR Approvers
  selectedPssrApproverRoleIds: string[];
  onPssrApproverToggle: (roleId: string) => void;
  isPssrApproversModified: boolean;
  onResetPssrApprovers: () => void;

  // SoF Approvers
  selectedSofApproverRoleIds: string[];
  onSofApproverToggle: (roleId: string) => void;
  isSofApproversModified: boolean;
  onResetSofApprovers: () => void;

  // Location context
  plantName?: string;
}

const WizardStepApproversSetup: React.FC<WizardStepApproversSetupProps> = ({
  pssrLeadId,
  onPssrLeadChange,
  selectedPssrApproverRoleIds,
  onPssrApproverToggle,
  isPssrApproversModified,
  onResetPssrApprovers,
  selectedSofApproverRoleIds,
  onSofApproverToggle,
  isSofApproversModified,
  onResetSofApprovers,
  plantName,
}) => {
  const [leadPopoverOpen, setLeadPopoverOpen] = useState(false);
  const { data: profileUsers, isLoading: usersLoading } = useProfileUsers();

  const sortedUsers = useMemo(() => {
    if (!profileUsers) return [];
    return [...profileUsers].sort((a, b) => {
      const aMatch = PSSR_LEAD_POSITION_KEYWORDS.some(k => a.position?.toLowerCase().includes(k.toLowerCase()));
      const bMatch = PSSR_LEAD_POSITION_KEYWORDS.some(k => b.position?.toLowerCase().includes(k.toLowerCase()));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });
  }, [profileUsers]);

  const selectedUser = profileUsers?.find(u => u.user_id === pssrLeadId);

  return (
    <div className="space-y-6">

      {/* PSSR Lead Selector */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <Label className="font-medium text-sm">PSSR Lead <span className="text-destructive">*</span></Label>
        </div>
        <p className="text-xs text-muted-foreground/70">
          Usually from Tech Safety, Asset, Operations or Maintenance. Search by name or role.
        </p>
        <Popover open={leadPopoverOpen} onOpenChange={setLeadPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={leadPopoverOpen}
              className="w-full justify-between h-10"
            >
              {selectedUser ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={selectedUser.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {selectedUser.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{selectedUser.full_name}</span>
                  {selectedUser.position && (
                    <span className="text-xs text-muted-foreground truncate ml-1">
                      — {selectedUser.position}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {usersLoading ? 'Loading...' : 'Search by name or role...'}
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 z-[9999]" align="start" side="bottom" sideOffset={4} avoidCollisions>
            <Command>
              <CommandInput placeholder="Search by name, position or role..." />
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup className="max-h-[250px] overflow-y-auto">
                  {sortedUsers.map((user) => {
                    const isRecommended = PSSR_LEAD_POSITION_KEYWORDS.some(k =>
                      user.position?.toLowerCase().includes(k.toLowerCase())
                    );
                    return (
                      <CommandItem
                        key={user.user_id}
                        value={`${user.full_name} ${user.position || ''} ${user.role || ''}`}
                        onSelect={() => {
                          onPssrLeadChange(user.user_id === pssrLeadId ? '' : user.user_id);
                          setLeadPopoverOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {user.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{user.full_name}</span>
                              {isRecommended && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                                  Recommended
                                </span>
                              )}
                            </div>
                            {(user.position || user.role) && (
                              <span className="text-xs text-muted-foreground truncate">
                                {user.position}{user.position && user.role ? ' · ' : ''}{user.role}
                              </span>
                            )}
                          </div>
                          <Check
                            className={cn(
                              'h-4 w-4 shrink-0',
                              pssrLeadId === user.user_id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* PSSR Approvers */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">PSSR Approvers</span>
            <Badge variant="secondary" className="text-xs">
              {selectedPssrApproverRoleIds.length} roles
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isPssrApproversModified ? (
              <>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
                  Modified
                </Badge>
                <Button variant="ghost" size="sm" onClick={onResetPssrApprovers} className="text-xs h-7">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </>
            ) : (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700">
                <Sparkles className="h-3 w-3 mr-1" />
                From Template
              </Badge>
            )}
          </div>
        </div>
        <WizardStepApprovers
          type="pssr"
          selectedRoleIds={selectedPssrApproverRoleIds}
          disabledRoleIds={selectedSofApproverRoleIds}
          onRoleToggle={onPssrApproverToggle}
          plantName={plantName}
        />
      </div>

      {/* SoF Approvers */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" />
            <span className="font-medium text-sm">SoF Approvers</span>
            <Badge variant="secondary" className="text-xs">
              {selectedSofApproverRoleIds.length} roles
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isSofApproversModified ? (
              <>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
                  Modified
                </Badge>
                <Button variant="ghost" size="sm" onClick={onResetSofApprovers} className="text-xs h-7">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </>
            ) : (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700">
                <Sparkles className="h-3 w-3 mr-1" />
                From Template
              </Badge>
            )}
          </div>
        </div>
        <WizardStepApprovers
          type="sof"
          selectedRoleIds={selectedSofApproverRoleIds}
          disabledRoleIds={selectedPssrApproverRoleIds}
          onRoleToggle={onSofApproverToggle}
          plantName={plantName}
        />
      </div>

      {/* Validation Note */}
      {(selectedPssrApproverRoleIds.length === 0 || selectedSofApproverRoleIds.length === 0) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
          <p className="text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> Please select at least one approver for both PSSR and SoF.
          </p>
        </div>
      )}
    </div>
  );
};

export default WizardStepApproversSetup;
