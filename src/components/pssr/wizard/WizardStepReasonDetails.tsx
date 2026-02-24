import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoles } from '@/hooks/useRoles';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { supabase } from '@/integrations/supabase/client';

interface PSSRReasonOption {
  id: string;
  name: string;
  description: string | null;
}

interface WizardStepReasonDetailsProps {
  reasonName: string;
  description: string;
  pssrLeadId: string;
  onReasonNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onPssrLeadChange: (roleId: string) => void;
}

const WizardStepReasonDetails: React.FC<WizardStepReasonDetailsProps> = ({
  reasonName,
  description,
  pssrLeadId,
  onReasonNameChange,
  onDescriptionChange,
  onPssrLeadChange,
}) => {
  const [reasonOptions, setReasonOptions] = useState<PSSRReasonOption[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(true);

  // Fetch PSSR reasons from database
  useEffect(() => {
    const fetchReasons = async () => {
      const { data, error } = await supabase
        .from('pssr_reasons')
        .select('id, name, description')
        .eq('is_active', true)
        .order('display_order');
      if (!error && data) {
        setReasonOptions(data);
      }
      setLoadingReasons(false);
    };
    fetchReasons();
  }, []);

  const knownNames = reasonOptions.map(r => r.name);
  const isOther = reasonName !== '' && !knownNames.includes(reasonName);
  const [selectValue, setSelectValue] = useState(isOther ? 'Other' : reasonName);
  const [customReason, setCustomReason] = useState(isOther ? reasonName : '');
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);

  // Sync selectValue when reasonOptions load
  useEffect(() => {
    if (reasonOptions.length > 0 && reasonName) {
      const match = reasonOptions.find(r => r.name === reasonName);
      setSelectValue(match ? reasonName : 'Other');
      if (!match && reasonName) {
        setCustomReason(reasonName);
      }
    }
  }, [reasonOptions, reasonName]);

  const selectedReason = reasonOptions.find(r => r.name === selectValue);

  const { roles = [], isLoading: rolesLoading } = useRoles();
  const { data: profileUsers } = useProfileUsers();

  const selectedRole = roles.find(r => r.id === pssrLeadId);

  // Find matching profiles for the selected role
  const matchingProfiles = pssrLeadId && selectedRole && profileUsers
    ? profileUsers.filter(u => {
        const pos = u.position?.toLowerCase() || '';
        const roleName = selectedRole.name.toLowerCase();
        return pos.includes(roleName) || roleName.includes(pos);
      }).slice(0, 5)
    : [];

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
        <Select value={selectValue} onValueChange={handleSelectChange} disabled={loadingReasons}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loadingReasons ? "Loading reasons..." : "Select a PSSR reason..."} />
          </SelectTrigger>
          <SelectContent>
            {reasonOptions.map((option) => (
              <SelectItem key={option.id} value={option.name}>
                {option.name}
              </SelectItem>
            ))}
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Description subtext for selected reason */}
        {selectedReason?.description && (
          <p className="text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
            {selectedReason.description}
          </p>
        )}

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

      {/* PSSR Lead Role Selector */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            PSSR Lead Role
          </div>
        </Label>
        <p className="text-sm text-muted-foreground -mt-1">
          Select the role responsible for leading the PSSR. The actual person will be resolved based on the plant/location when the PSSR is created.
        </p>
        <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen} modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={rolePopoverOpen}
              className="w-full justify-between h-10"
            >
              {selectedRole ? (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{selectedRole.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {rolesLoading ? 'Loading roles...' : 'Select a PSSR Lead role...'}
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search roles..." />
              <CommandList>
                <CommandEmpty>No roles found.</CommandEmpty>
                <CommandGroup className="max-h-[250px] overflow-y-auto">
                  {roles.map((role) => (
                    <CommandItem
                      key={role.id}
                      value={role.name}
                      onSelect={() => {
                        onPssrLeadChange(role.id === pssrLeadId ? '' : role.id);
                        setRolePopoverOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{role.name}</span>
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0',
                            pssrLeadId === role.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Matching profiles preview */}
        {selectedRole && matchingProfiles.length > 0 && (
          <div className="bg-muted/30 rounded-md px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>Matching profiles for "{selectedRole.name}":</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchingProfiles.map(u => (
                <Badge key={u.user_id} variant="secondary" className="text-xs font-normal">
                  {u.full_name}
                  {u.position && <span className="text-muted-foreground ml-1">— {u.position}</span>}
                </Badge>
              ))}
            </div>
          </div>
        )}
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
