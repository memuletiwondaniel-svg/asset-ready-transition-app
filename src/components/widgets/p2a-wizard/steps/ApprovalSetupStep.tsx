import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Plus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface WizardApprover {
  id: string;
  role_name: string;
  display_order: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
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
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

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
    populateApproversFromTeam(teamMembers, null);
  };

  const handleDeleteApprover = (id: string) => {
    onApproversChange(approvers.filter(a => a.id !== id));
  };


  const handleAddApprover = () => {
    const maxOrder = approvers.reduce((max, a) => Math.max(max, a.display_order), 0);
    onApproversChange([
      ...approvers,
      {
        id: `approver-custom-${Date.now()}`,
        role_name: newRoleName.trim() || 'New Approver',
        display_order: maxOrder + 1,
      },
    ]);
    setNewRoleName('');
    setShowAddRow(false);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const resolveAvatarUrl = (avatarUrl?: string): string | undefined => {
    if (!avatarUrl) return undefined;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Approvers</h3>
          <p className="text-xs text-muted-foreground">
            Auto-populated from project team
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
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2 ml-4">
          {approvers.map((approver) => {
            const hasUser = !!approver.user_id;
            return (
              <div key={approver.id} className="group flex items-center gap-3 p-3.5 rounded-lg border bg-card hover:bg-accent/50 hover:shadow-md hover:border-primary/20 transition-all duration-200 max-w-md cursor-default">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={resolveAvatarUrl(approver.user_avatar)} />
                  <AvatarFallback className="text-xs bg-muted">
                    {getInitials(approver.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {hasUser ? (
                    <>
                      <span className="text-sm font-medium">{approver.user_name}</span>
                      <p className="text-xs text-muted-foreground truncate">{approver.role_name}</p>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-muted-foreground">{approver.role_name}</span>
                      <p className="text-[10px] text-amber-600">Not assigned</p>
                    </>
                  )}
                </div>
                <div className="flex items-center shrink-0">
                  <button
                    onClick={() => handleDeleteApprover(approver.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-destructive"
                    title="Remove approver"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {showAddRow ? (
            <div className="flex items-center gap-2 max-w-md">
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Role name, e.g. Safety Lead"
                className="h-9 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newRoleName.trim()) handleAddApprover();
                  if (e.key === 'Escape') { setShowAddRow(false); setNewRoleName(''); }
                }}
              />
              <Button size="sm" onClick={handleAddApprover} disabled={!newRoleName.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddRow(false); setNewRoleName(''); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs mt-1"
              onClick={() => setShowAddRow(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Approver
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
