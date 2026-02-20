import React, { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfileUsers } from '@/hooks/useProfileUsers';

const PSSR_REASON_OPTIONS = [
  'Start-up after a Process Safety Incidence or Near Miss (RAM 5A/B and RED)',
  'Start-up after a Turn Around Maintenance (TAR)',
  'Startup of a retired or idle equipment (over 6 months)',
  'Start-up after a plant modification (Asset MoC)',
  'Other',
];

const PSSR_LEAD_POSITION_KEYWORDS = ['Tech Safety', 'Asset', 'Operations', 'Maintenance', 'MTCE'];

interface WizardStepReasonDetailsProps {
  reasonName: string;
  description: string;
  pssrLeadId: string;
  onReasonNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onPssrLeadChange: (userId: string) => void;
}

const WizardStepReasonDetails: React.FC<WizardStepReasonDetailsProps> = ({
  reasonName,
  description,
  pssrLeadId,
  onReasonNameChange,
  onDescriptionChange,
  onPssrLeadChange,
}) => {
  const isOther = !PSSR_REASON_OPTIONS.slice(0, -1).includes(reasonName) && reasonName !== '';
  const [selectValue, setSelectValue] = useState(isOther ? 'Other' : reasonName);
  const [customReason, setCustomReason] = useState(isOther ? reasonName : '');
  const [leadPopoverOpen, setLeadPopoverOpen] = useState(false);

  const { data: profileUsers, isLoading: usersLoading } = useProfileUsers();

  // Sort: prioritize Tech Safety, Asset, Operations, Maintenance positions
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

  const handleSelectChange = (value: string) => {
    setSelectValue(value);
    if (value === 'Other') {
      onReasonNameChange(customReason);
    } else {
      setCustomReason('');
      onReasonNameChange(value);
    }
  };

  const handleCustomReasonChange = (value: string) => {
    setCustomReason(value);
    onReasonNameChange(value);
  };

  return (
    <div className="space-y-6">
      {/* Reason Dropdown */}
      <div className="space-y-3">
        <Label htmlFor="reason-name" className="text-base font-medium">PSSR Reason *</Label>
        <Select value={selectValue} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a PSSR reason..." />
          </SelectTrigger>
          <SelectContent>
            {PSSR_REASON_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectValue === 'Other' && (
          <div className="space-y-2 mt-3">
            <Label htmlFor="custom-reason" className="text-sm font-medium">Specify PSSR Reason *</Label>
            <Input
              id="custom-reason"
              value={customReason}
              onChange={(e) => handleCustomReasonChange(e.target.value)}
              placeholder="Enter custom PSSR reason..."
              maxLength={200}
            />
          </div>
        )}
      </div>

      {/* PSSR Lead Selector */}
      <div className="space-y-3">
        <Label className="text-base font-medium">PSSR Lead</Label>
        <p className="text-sm text-muted-foreground -mt-1">
          Usually from Tech Safety, Asset, Operations or Maintenance
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
                  {usersLoading ? 'Loading...' : 'Search and select PSSR Lead...'}
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search by name or position..." />
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
                        value={`${user.full_name} ${user.position || ''}`}
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
                            {user.position && (
                              <span className="text-xs text-muted-foreground truncate">
                                {user.position}
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

      {/* Additional Description */}
      <div className="space-y-3">
        <Label htmlFor="description" className="text-base font-medium">Additional Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Provide additional context or details about this PSSR reason..."
          maxLength={500}
          rows={4}
        />
        <p className="text-sm text-muted-foreground">
          {description.length}/500 characters
        </p>
      </div>
    </div>
  );
};

export default WizardStepReasonDetails;
