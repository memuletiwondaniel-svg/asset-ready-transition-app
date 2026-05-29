import React, { useEffect, useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { Sparkles, X, AlertCircle, CheckCircle2 } from 'lucide-react';
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

const getInitials = (name?: string) =>
  !name ? '?' : name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

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

  // Auto-populate on mount when suggestions arrive
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

  const userOptions = useMemo(
    () =>
      allUsers.map((u) => ({
        value: u.user_id,
        label: u.full_name || u.email || 'Unknown',
        description: u.position || u.email,
      })),
    [allUsers]
  );

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
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Key roles are auto-resolved from your Portfolio and Hub. Edit any assignment as needed.
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
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                assigned
                  ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                  : 'bg-muted/20 border-border/60'
              }`}
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
                    <p className="text-sm font-semibold text-foreground truncate">
                      {member.user_name}
                    </p>
                    {member.position && (
                      <p className="text-xs text-muted-foreground truncate">{member.position}</p>
                    )}
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="w-44 shrink-0">
                    <EnhancedCombobox
                      options={userOptions}
                      value={member.user_id}
                      onValueChange={(v) => v && handleAssign(role, v)}
                      placeholder="Change"
                      emptyText="No users found"
                      allowCreate={false}
                      className="w-full h-8"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(role)}
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <div className="flex-1">
                  <EnhancedCombobox
                    options={userOptions}
                    value=""
                    onValueChange={(v) => v && handleAssign(role, v)}
                    placeholder="Select team member..."
                    emptyText="No users found"
                    allowCreate={false}
                    className="w-full"
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
