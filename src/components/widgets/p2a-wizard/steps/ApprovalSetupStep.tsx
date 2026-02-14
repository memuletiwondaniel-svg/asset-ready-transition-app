import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users,
  UserCheck,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface WizardApprover {
  id: string;
  role_name: string;
  display_order: number;
  user_id?: string;
  user_name?: string;
  user_avatar?: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  is_lead: boolean;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

/**
 * Fixed approval sequence – hardcoded, not user-reorderable.
 * Phase 1 (parallel): ORA Lead, Construction Lead, Commissioning Lead
 * Phase 2 (after Phase 1): Project Hub Lead, Deputy Plant Director
 */
const FIXED_APPROVER_ROLES = [
  { key: 'ora_lead', label: 'ORA Lead', order: 1, phase: 1 },
  { key: 'construction_lead', label: 'Construction Lead', order: 2, phase: 1 },
  { key: 'commissioning_lead', label: 'Commissioning Lead', order: 3, phase: 1 },
  { key: 'hub_lead', label: 'Project Hub Lead', order: 4, phase: 2 },
  { key: 'deputy_plant_director', label: 'Deputy Plant Director', order: 5, phase: 2 },
] as const;

/** Match a team member role string to one of our fixed keys */
const matchRoleKey = (teamRole: string): string | null => {
  const r = teamRole.toLowerCase().trim();

  if (r.includes('ora lead') || r === 'ora lead') return 'ora_lead';
  if (r.includes('construction lead') || r === 'construction lead') return 'construction_lead';
  if (
    r.includes('commissioning lead') ||
    r.includes('csu lead') ||
    r === 'commissioning lead'
  )
    return 'commissioning_lead';
  if (
    r.includes('hub lead') ||
    r.includes('project hub lead') ||
    r === 'hub lead'
  )
    return 'hub_lead';
  if (
    r.includes('deputy plant director') ||
    r === 'deputy plant director'
  )
    return 'deputy_plant_director';

  return null;
};

interface ApprovalSetupStepProps {
  approvers: WizardApprover[];
  projectId: string;
  plantName?: string;
  onApproversChange: (approvers: WizardApprover[]) => void;
}

export const ApprovalSetupStep: React.FC<ApprovalSetupStepProps> = ({
  approvers,
  projectId,
  plantName,
  onApproversChange,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Fetch team members and auto-populate approvers
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!projectId) return;

      setIsLoading(true);
      try {
        // Resolve the project's plant name if not provided
        let resolvedPlantName = plantName;
        if (!resolvedPlantName) {
          const { data: projectData } = await supabase
            .from('projects')
            .select('plant_id')
            .eq('id', projectId)
            .single();
          
          if (projectData?.plant_id) {
            const { data: plantData } = await supabase
              .from('plant')
              .select('name')
              .eq('id', projectData.plant_id)
              .single();
            resolvedPlantName = plantData?.name || null;
          }
        }
        console.log('[P2A Approval] Resolved plant name:', resolvedPlantName);
        const { data: teamData, error: teamError } = await supabase
          .from('project_team_members')
          .select('id, user_id, role, is_lead')
          .eq('project_id', projectId);

        if (teamError) throw teamError;

        const userIds = Array.from(
          new Set((teamData || []).map((m: any) => m.user_id).filter(Boolean))
        );

        // Also find Deputy Plant Director using SECURITY DEFINER function (bypasses RLS)
        let deputyProfile: { user_id: string; full_name: string; avatar_url?: string } | null = null;
        if (resolvedPlantName) {
          const { data: deputies, error: deputyError } = await supabase
            .rpc('find_deputy_plant_director', { plant_name_param: resolvedPlantName });

          console.log('[P2A Approval] Deputy lookup result:', { deputies, deputyError, resolvedPlantName });

          if (deputies && deputies.length > 0) {
            deputyProfile = deputies[0];
            // Add deputy user_id to the list for profile resolution
            if (!userIds.includes(deputyProfile.user_id)) {
              userIds.push(deputyProfile.user_id);
            }
          }
        }

        let profilesMap: Record<string, { full_name: string; avatar_url?: string }> = {};

        if (userIds.length > 0) {
          const results = await Promise.all(
            userIds.map(async (userId) => {
              const { data, error } = await (supabase as any).rpc('get_safe_profile_data', {
                target_user_id: userId,
              });
              if (error || !data) return null;
              const row = Array.isArray(data) ? data[0] : data;
              if (!row?.user_id) return null;
              return {
                user_id: row.user_id as string,
                full_name: row.full_name as string,
                avatar_url: row.avatar_url as string | undefined,
              };
            })
          );

          profilesMap = results
            .filter(Boolean)
            .reduce((acc, p: any) => {
              acc[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
              return acc;
            }, {} as Record<string, { full_name: string; avatar_url?: string }>);
        }

        const members: TeamMember[] = (teamData || []).map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          is_lead: m.is_lead,
          profile: profilesMap[m.user_id] || undefined,
        }));

        setTeamMembers(members);

        // Always populate from fixed roles on first load, or if there are issues
        const deputyApprover = approvers.find(a => a.role_name === 'Deputy Plant Director');
        const deputyNeedsUpdate = deputyApprover && !deputyApprover.user_id && deputyProfile;

        if (approvers.length === 0 || shouldRepopulate(approvers) || deputyNeedsUpdate) {
          populateApproversFromTeam(members, deputyProfile ? {
            user_id: deputyProfile.user_id,
            full_name: profilesMap[deputyProfile.user_id]?.full_name || deputyProfile.full_name,
            avatar_url: profilesMap[deputyProfile.user_id]?.avatar_url || deputyProfile.avatar_url,
          } : null);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
        if (approvers.length === 0) {
          populateApproversFromTeam([], null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, [projectId, plantName]);

  /** Check if existing approvers look stale (e.g. have duplicate roles) */
  const shouldRepopulate = (current: WizardApprover[]): boolean => {
    const roleKeys = current.map(a => matchRoleKey(a.role_name)).filter(Boolean);
    return new Set(roleKeys).size !== roleKeys.length; // duplicates detected
  };

  const populateApproversFromTeam = (
    members: TeamMember[],
    deputyDirector: { user_id: string; full_name: string; avatar_url?: string } | null
  ) => {
    // Build a map: role key → best matching team member (first match wins, no duplicates)
    const matchedUserIds = new Set<string>();

    const approverList: WizardApprover[] = FIXED_APPROVER_ROLES.map((role) => {
      // For Deputy Plant Director, use the plant-based lookup instead of team member matching
      if (role.key === 'deputy_plant_director' && deputyDirector) {
        matchedUserIds.add(deputyDirector.user_id);
        return {
          id: `approver-${role.key}`,
          role_name: role.label,
          display_order: role.order,
          user_id: deputyDirector.user_id,
          user_name: deputyDirector.full_name,
          user_avatar: deputyDirector.avatar_url,
        };
      }

      const match = members.find((m) => {
        if (matchedUserIds.has(m.user_id)) return false;
        return matchRoleKey(m.role) === role.key;
      });

      if (match) matchedUserIds.add(match.user_id);

      return {
        id: `approver-${role.key}`,
        role_name: role.label,
        display_order: role.order,
        user_id: match?.user_id,
        user_name: match?.profile?.full_name,
        user_avatar: match?.profile?.avatar_url,
      };
    });

    onApproversChange(approverList);
  };

  const handleRefreshFromTeam = () => {
    // Re-trigger the effect by clearing approvers
    populateApproversFromTeam(teamMembers, null);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Approval Workflow</h3>
          <p className="text-xs text-muted-foreground">
            Auto-populated from project team members
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefreshFromTeam}
          className="text-xs gap-1"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh from Team
        </Button>
      </div>

      <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
        <div className="flex items-start gap-2">
          <Users className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-400">
            <strong>Two-Phase Approval:</strong> ORA Lead, Construction Lead, and Commissioning Lead 
            approve first. Once all three have signed off, the Project Hub Lead and Deputy Plant Director 
            are notified to give final approval.
          </div>
        </div>
      </div>

      {/* Phase 1 Header */}
      <div className="flex items-center gap-2 pt-1">
        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
          Phase 1
        </Badge>
        <span className="text-[10px] text-muted-foreground">Technical Review</span>
      </div>

      {/* Approvers List */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {FIXED_APPROVER_ROLES.map((role, index) => {
                  const approver = approvers.find(a => a.role_name === role.label);

                  // Insert Phase 2 header before the 4th item
                  const showPhase2Header = index === 3;

                  return (
                    <React.Fragment key={role.key}>
                      {showPhase2Header && (
                        <div className="flex items-center gap-2 pt-3 pb-1 px-1">
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                            Phase 2
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">Final Approval</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          {index + 1}
                        </div>
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={approver?.user_avatar} />
                          <AvatarFallback className="text-xs bg-muted">
                            {getInitials(approver?.user_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          {approver?.user_name ? (
                            <>
                              <span className="text-sm font-medium">{approver.user_name}</span>
                              <p className="text-xs text-muted-foreground truncate">
                                {role.label}
                              </p>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-muted-foreground">{role.label}</span>
                              <p className="text-[10px] text-amber-600">
                                No team member assigned
                              </p>
                            </>
                          )}
                        </div>
                        {approver?.user_id ? (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            Assigned
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Unassigned
                          </Badge>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Summary */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="text-xs text-muted-foreground">
          <strong>5</strong> approvers in 2 phases. 
          Estimated review time: <strong>5-10 days</strong>
        </div>
      </div>
    </div>
  );
};
