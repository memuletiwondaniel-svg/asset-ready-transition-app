import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Shield, Users, ClipboardList, CheckCircle2, HelpCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoles } from '@/hooks/useRoles';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { usePSSRReasons } from '@/hooks/usePSSRReasons';
import { getReasonCardConfig, getDisplayName } from './reasonCardConfig';

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
  const { data: reasons, isLoading: loadingReasons } = usePSSRReasons();

  const knownNames = reasons?.map(r => r.name) ?? [];
  const isOther = reasonName !== '' && !knownNames.includes(reasonName);
  const [customReason, setCustomReason] = useState(isOther ? reasonName : '');
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);

  // Sync customReason when reasons load
  useEffect(() => {
    if (reasons && reasons.length > 0 && reasonName) {
      const match = reasons.find(r => r.name === reasonName);
      if (!match && reasonName) {
        setCustomReason(reasonName);
      }
    }
  }, [reasons, reasonName]);

  const OTHER_VALUE = '__other__';
  const isOtherSelected = isOther || reasonName === OTHER_VALUE;

  const handleCardSelect = (name: string) => {
    if (name === OTHER_VALUE) {
      setCustomReason('');
      onReasonNameChange(OTHER_VALUE);
    } else {
      setCustomReason('');
      onReasonNameChange(name);
    }
  };

  const handleCustomReasonChange = (value: string) => {
    setCustomReason(value);
    onReasonNameChange(value);
  };

  const { roles = [], isLoading: rolesLoading } = useRoles();
  const { data: profileUsers } = useProfileUsers();

  const selectedRole = roles.find(r => r.id === pssrLeadId);

  const matchingProfiles = pssrLeadId && selectedRole && profileUsers
    ? profileUsers.filter(u => {
        const pos = u.position?.toLowerCase() || '';
        const roleName = selectedRole.name.toLowerCase();
        return pos.includes(roleName) || roleName.includes(pos);
      }).slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      {/* Reason Card Selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <Label className="text-base font-medium">PSSR Reason *</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Select the reason that best describes the purpose of this PSSR
        </p>

        {loadingReasons ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {reasons?.map((reason) => {
              const config = getReasonCardConfig(reason.name);
              const IconComponent = config.icon;
              const isSelected = reasonName === reason.name;
              const displayName = getDisplayName(reason.name);

              return (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => handleCardSelect(reason.name)}
                  className={cn(
                    'group relative flex items-center gap-3.5 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden',
                    isSelected
                      ? 'border-primary shadow-md'
                      : 'border-border/50 hover:border-border hover:shadow-sm'
                  )}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, hsl(${config.hue} 75% 96%), hsl(${config.hue} 65% 93%))`
                      : undefined,
                  }}
                >
                  <div
                    className={cn(
                      'absolute inset-0 opacity-0 transition-opacity duration-200 pointer-events-none',
                      !isSelected && 'group-hover:opacity-100'
                    )}
                    style={{
                      background: `linear-gradient(135deg, hsl(${config.hue} 60% 95% / 0.9), hsl(${config.hue} 50% 92% / 0.6))`,
                    }}
                  />
                  <div
                    className="relative z-10 p-2 rounded-lg shrink-0 transition-colors duration-200"
                    style={{
                      backgroundColor: isSelected
                        ? `hsl(${config.hue} 65% 88%)`
                        : `hsl(${config.hue} 40% 92%)`,
                    }}
                  >
                    <IconComponent
                      className="h-5 w-5 transition-colors duration-200"
                      strokeWidth={2.25}
                      style={{
                        color: isSelected
                          ? `hsl(${config.hue} 80% 35%)`
                          : `hsl(${config.hue} 50% 42%)`,
                      }}
                    />
                  </div>
                  <div className="relative z-10 flex-1 min-w-0">
                    <h4 className={cn(
                      'font-semibold text-sm leading-snug transition-colors',
                      isSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
                    )}>
                      {displayName}
                    </h4>
                    {reason.description && (
                      <p className={cn(
                        'text-xs leading-snug mt-0.5 line-clamp-1 transition-colors',
                        isSelected ? 'text-muted-foreground' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
                      )}>
                        {reason.description}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="relative z-10 h-5 w-5 shrink-0 text-primary animate-in fade-in zoom-in duration-200" />
                  )}
                </button>
              );
            })}

            {/* Other card */}
            <button
              type="button"
              onClick={() => handleCardSelect(OTHER_VALUE)}
              className={cn(
                'group relative flex items-center gap-3.5 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden',
                isOtherSelected
                  ? 'border-primary shadow-md'
                  : 'border-border/50 hover:border-border hover:shadow-sm'
              )}
              style={{
                background: isOtherSelected
                  ? `linear-gradient(135deg, hsl(0 0% 94%), hsl(0 0% 91%))`
                  : undefined,
              }}
            >
              <div
                className={cn(
                  'absolute inset-0 opacity-0 transition-opacity duration-200 pointer-events-none',
                  !isOtherSelected && 'group-hover:opacity-100'
                )}
                style={{
                  background: `linear-gradient(135deg, hsl(0 0% 95% / 0.9), hsl(0 0% 93% / 0.6))`,
                }}
              />
              <div
                className="relative z-10 p-2 rounded-lg shrink-0 transition-colors duration-200"
                style={{
                  backgroundColor: isOtherSelected ? 'hsl(0 0% 86%)' : 'hsl(0 0% 92%)',
                }}
              >
                <HelpCircle
                  className="h-5 w-5 transition-colors duration-200"
                  strokeWidth={2.25}
                  style={{ color: isOtherSelected ? 'hsl(0 0% 30%)' : 'hsl(0 0% 45%)' }}
                />
              </div>
              <div className="relative z-10 flex-1 min-w-0">
                <h4 className={cn(
                  'font-semibold text-sm leading-snug transition-colors',
                  isOtherSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
                )}>
                  Other
                </h4>
                <p className={cn(
                  'text-xs leading-snug mt-0.5 transition-colors',
                  isOtherSelected ? 'text-muted-foreground' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
                )}>
                  Other reason not listed above
                </p>
              </div>
              {isOtherSelected && (
                <CheckCircle2 className="relative z-10 h-5 w-5 shrink-0 text-primary animate-in fade-in zoom-in duration-200" />
              )}
            </button>
          </div>
        )}

        {isOtherSelected && (
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
