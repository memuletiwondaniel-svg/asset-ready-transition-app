import React, { useEffect, useState } from 'react';
import { ProjectTeamSection } from '../ProjectTeamSection';
import { useAutoPopulateTeam } from '@/hooks/useAutoPopulateTeam';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RefreshCw, Sparkles, Users, CheckCircle2, AlertCircle } from 'lucide-react';

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

const REQUIRED_ROLES = [
  'Project Hub Lead',
  'Construction Lead',
  'Commissioning Lead',
  'Snr. ORA Engr.',
];

const WizardStepProjectTeam: React.FC<WizardStepProjectTeamProps> = ({
  teamMembers,
  setTeamMembers,
  regionName = null,
  hubName = null,
  hubId = null,
}) => {
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);
  const { suggestedTeam, isLoading } = useAutoPopulateTeam(regionName, hubName, hubId);

  // Auto-populate on mount if team is empty and we have suggestions
  useEffect(() => {
    if (!hasAutoPopulated && teamMembers.length === 0 && suggestedTeam.length > 0 && !isLoading) {
      setTeamMembers(suggestedTeam);
      setHasAutoPopulated(true);
    }
  }, [suggestedTeam, hasAutoPopulated, teamMembers.length, isLoading, setTeamMembers]);

  const handleAutoPopulate = () => {
    if (suggestedTeam.length > 0) {
      const manualMembers = teamMembers.filter(m => !m.is_auto_populated);
      const suggestedRoles = suggestedTeam.map(s => s.role);
      const filteredManual = manualMembers.filter(m => !suggestedRoles.includes(m.role));
      
      setTeamMembers([...filteredManual, ...suggestedTeam]);
      setHasAutoPopulated(true);
    }
  };

  const autoPopulatedCount = teamMembers.filter(m => m.is_auto_populated).length;

  // Check which required roles are filled
  const getRequiredRoleStatus = () => {
    return REQUIRED_ROLES.map(role => {
      const member = teamMembers.find(m => m.role === role);
      return { role, member, assigned: !!member };
    });
  };

  const roleStatuses = getRequiredRoleStatus();
  const allRequiredFilled = roleStatuses.every(r => r.assigned);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium mb-1">Project Team</h3>
        <p className="text-sm text-muted-foreground">
          Assign team members to required roles. Members are auto-resolved based on your Portfolio and Hub selection.
        </p>
      </div>

      {/* Auto-resolved summary cards */}
      {(regionName || hubName) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-foreground">
                Auto-resolved Team
              </span>
              {autoPopulatedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {autoPopulatedCount} member{autoPopulatedCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {suggestedTeam.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoPopulate}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Re-populate
              </Button>
            )}
          </div>

          {/* Required role cards with auto-resolved members */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {roleStatuses.map(({ role, member, assigned }) => (
              <div
                key={role}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  assigned
                    ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                    : 'bg-muted/30 border-border/50'
                }`}
              >
                {assigned && member ? (
                  <Avatar className="h-9 w-9 border-2 border-emerald-300 dark:border-emerald-700">
                    <AvatarImage src={(member as any).avatar_url} alt={member.user_name} />
                    <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      {getInitials(member.user_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-9 w-9 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{role}</p>
                  {assigned && member ? (
                    <p className="text-sm font-semibold text-foreground truncate">{member.user_name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground/60 italic">Not assigned</p>
                  )}
                </div>
                {assigned && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                )}
              </div>
            ))}
          </div>

          {!allRequiredFilled && (regionName || hubName) && (
            <p className="text-xs text-muted-foreground">
              {!regionName && !hubName
                ? 'Select a Portfolio and Hub in Step 1 to auto-resolve team members.'
                : !regionName
                  ? 'Select a Portfolio to auto-resolve Construction Lead, Commissioning Lead, and Snr. ORA Engr.'
                  : !hubName
                    ? 'Select a Hub to auto-resolve the Project Hub Lead.'
                    : 'Some roles could not be auto-resolved. Please assign them manually below.'}
            </p>
          )}
        </div>
      )}

      {!regionName && !hubName && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50/50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Go back to Step 1 and select a <strong>Portfolio</strong> and <strong>Hub</strong> to automatically resolve team members.
          </p>
        </div>
      )}

      <ProjectTeamSection
        teamMembers={teamMembers}
        setTeamMembers={setTeamMembers}
        regionName={regionName}
        hubName={hubName}
        hubId={hubId}
      />
    </div>
  );
};

export default WizardStepProjectTeam;
