import React, { useEffect, useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lightbulb, Trash2, AlertCircle, CheckCircle2, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutoPopulateTeam } from '@/hooks/useAutoPopulateTeam';
import { useProfileUsers } from '@/hooks/useProfileUsers';

interface TeamMember {
  user_id: string;
  role: string;
  is_lead: boolean;
  user_name?: string;
  user_email?: string;
  avatar_url?: string;
  position?: string;
  is_auto_populated?: boolean;
}

interface WizardStepProjectTeamProps {
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  regionName?: string | null;
  hubName?: string | null;
  hubId?: string | null;
}

const KEY_ROLES = [
  'Project Hub Lead',
  'Construction Lead',
  'Commissioning Lead',
  'Snr. ORA Engr.',
  'Deputy Plant Director',
];

// Patterns used to filter eligible users per role (matches against position / role)
const ROLE_ELIGIBILITY: Record<string, string[]> = {
  'Project Hub Lead': ['hub lead', 'project hub lead'],
  'Construction Lead': ['construction lead', 'construction'],
  'Commissioning Lead': ['commissioning lead', 'commissioning'],
  'Snr. ORA Engr.': ['snr. ora engr', 'snr ora engr', 'snr. ora eng', 'snr ora eng', 'senior ora'],
  'Deputy Plant Director': ['dep. plant director', 'dep plant director', 'deputy plant director'],
};

const getInitials = (name?: string) =>
  !name ? '?' : name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

interface MemberPickerProps {
  role: string;
  currentUserId?: string;
  allUsers: ReturnType<typeof useProfileUsers>['data'];
  onSelect: (userId: string) => void;
  trigger: React.ReactNode;
}

const MemberPicker: React.FC<MemberPickerProps> = ({ role, currentUserId, allUsers = [], onSelect, trigger }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const eligible = useMemo(() => {
    const patterns = ROLE_ELIGIBILITY[role];
    if (!patterns || !allUsers) return allUsers ?? [];
    return allUsers.filter((u) => {
      const hay = `${u.position || ''} ${u.role || ''}`.toLowerCase();
      return patterns.some((p) => hay.includes(p));
    });
  }, [allUsers, role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter((u) =>
      [u.full_name, u.email, u.position].filter(Boolean).some((v) => v!.toLowerCase().includes(q))
    );
  }, [eligible, search]);

  const showSearch = eligible.length > 6;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" onOpenAutoFocus={(e) => !showSearch && e.preventDefault()}>
        <div className="px-3 py-2 border-b">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assign {role}
          </p>
        </div>
        <Command shouldFilter={false}>
          {showSearch && (
            <CommandInput
              placeholder="Search by name, email, position..."
              value={search}
              onValueChange={setSearch}
            />
          )}
          <CommandList
            className="max-h-72 overflow-y-auto overscroll-contain scrollbar-hidden"
            onWheel={(e) => {
              // Radix Dialog's scroll-lock blocks wheel events on portaled popovers.
              // Manually translate the wheel into a scrollTop change so the list scrolls.
              e.currentTarget.scrollTop += e.deltaY;
            }}
          >
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((u) => {
                const isCurrent = u.user_id === currentUserId;
                return (
                  <CommandItem
                    key={u.user_id}
                    value={u.user_id}
                    onSelect={() => { onSelect(u.user_id); setOpen(false); setSearch(''); }}
                    className="flex items-center gap-3 py-2 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar_url} alt={u.full_name} />
                      <AvatarFallback className="text-[10px]">{getInitials(u.full_name || u.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                      {u.position && <p className="text-xs text-muted-foreground truncate">{u.position}</p>}
                    </div>
                    {isCurrent && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const WizardStepProjectTeam: React.FC<WizardStepProjectTeamProps> = ({
  teamMembers,
  setTeamMembers,
  regionName = null,
  hubName = null,
  hubId = null,
}) => {
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);
  const { suggestedTeam, isLoading } = useAutoPopulateTeam(regionName, hubName, hubId);
  const { data: allUsers = [] } = useProfileUsers();

  useEffect(() => {
    if (!hasAutoPopulated && suggestedTeam.length > 0 && !isLoading) {
      const manualRoles = new Set(teamMembers.filter((m) => !m.is_auto_populated).map((m) => m.role));
      const additions = suggestedTeam.filter((s) => !manualRoles.has(s.role));
      if (additions.length > 0) {
        setTeamMembers((prev) => [...prev.filter((m) => !additions.some((a) => a.role === m.role)), ...additions]);
      }
      setHasAutoPopulated(true);
    }
  }, [suggestedTeam, hasAutoPopulated, isLoading, setTeamMembers, teamMembers]);

  const handleAssign = (role: string, userId: string) => {
    const user = allUsers.find((u) => u.user_id === userId);
    if (!user) return;
    setTeamMembers((prev) => [
      ...prev.filter((m) => m.role !== role),
      {
        user_id: user.user_id,
        role,
        is_lead: role === 'Project Hub Lead',
        user_name: user.full_name,
        user_email: user.email,
        avatar_url: user.avatar_url,
        position: user.position,
        is_auto_populated: false,
      },
    ]);
  };

  const handleRemove = (role: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.role !== role));
  };

  const contextMissing = !regionName && !hubName;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium mb-1">Project Team</h3>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500 fill-amber-100 dark:fill-amber-900/40" />
          <span>Roles below are auto-populated based on the portfolio and hub. Edit any assignment as needed.</span>
        </p>
      </div>

      {contextMissing && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Select a <strong>Portfolio</strong> and <strong>Hub</strong> in Step 1 to auto-resolve members.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {KEY_ROLES.map((role) => {
          const member = teamMembers.find((m) => m.role === role);
          const assigned = !!member;

          return (
            <div
              key={role}
              className={cn(
                'group flex items-center gap-3 p-3 rounded-lg border transition-colors',
                assigned
                  ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                  : 'bg-muted/20 border-border/60'
              )}
            >
              <div className="w-44 shrink-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {role}
                </p>
              </div>

              {assigned ? (
                <>
                  <Avatar className="h-9 w-9 border-2 border-emerald-300 dark:border-emerald-700">
                    <AvatarImage src={member.avatar_url} alt={member.user_name} />
                    <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      {getInitials(member.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{member.user_name}</p>
                    {member.position && (
                      <p className="text-xs text-muted-foreground truncate">{member.position}</p>
                    )}
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <MemberPicker
                      role={role}
                      currentUserId={member.user_id}
                      allUsers={allUsers}
                      onSelect={(uid) => handleAssign(role, uid)}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Change member"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(role)}
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1">
                  <MemberPicker
                    role={role}
                    allUsers={allUsers}
                    onSelect={(uid) => handleAssign(role, uid)}
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-muted-foreground font-normal"
                      >
                        Select team member...
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WizardStepProjectTeam;
