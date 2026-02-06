import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Trash2, 
  Users,
  UserCheck,
  ChevronUp,
  ChevronDown,
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

// Roles that should be included as approvers (in order)
const APPROVER_ROLE_PRIORITY = [
  'Project Hub Lead',
  'Hub Lead',
  'ORA Lead',
  'CSU Lead',
  'Commissioning Lead',
  'Construction Lead',
  'Deputy Plant Director',
  'Plant Director',
];

// Fallback defaults if no team members found
const DEFAULT_APPROVERS: WizardApprover[] = [
  { id: 'approver-1', role_name: 'Project Hub Lead', display_order: 1 },
  { id: 'approver-2', role_name: 'ORA Lead', display_order: 2 },
  { id: 'approver-3', role_name: 'CSU Lead', display_order: 3 },
  { id: 'approver-4', role_name: 'Construction Lead', display_order: 4 },
  { id: 'approver-5', role_name: 'Deputy Plant Director', display_order: 5 },
];

interface ApprovalSetupStepProps {
  approvers: WizardApprover[];
  projectId: string;
  onApproversChange: (approvers: WizardApprover[]) => void;
}

export const ApprovalSetupStep: React.FC<ApprovalSetupStepProps> = ({
  approvers,
  projectId,
  onApproversChange,
}) => {
  const [newRoleName, setNewRoleName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Fetch team members and auto-populate approvers
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      try {
        // First fetch team members
        const { data: teamData, error: teamError } = await supabase
          .from('project_team_members')
          .select('id, user_id, role, is_lead')
          .eq('project_id', projectId);

        if (teamError) throw teamError;

        // Then fetch profiles for all user_ids.
        // NOTE: Direct SELECT on `profiles` may be blocked by RLS for other users.
        // We use the SECURITY DEFINER RPC that safely returns basic profile data.
        const userIds = Array.from(
          new Set((teamData || []).map((m: any) => m.user_id).filter(Boolean))
        );

        let profilesMap: Record<string, { full_name: string; avatar_url?: string }> = {};

        if (userIds.length > 0) {
          const results = await Promise.all(
            userIds.map(async (userId) => {
              // get_safe_profile_data returns: user_id, full_name, avatar_url, ...
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

        // Auto-populate approvers if empty
        if (approvers.length === 0 && members.length > 0) {
          populateApproversFromTeam(members);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
        // Fall back to defaults
        if (approvers.length === 0) {
          onApproversChange(DEFAULT_APPROVERS);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, [projectId]);

  const populateApproversFromTeam = (members: TeamMember[]) => {
    const approverList: WizardApprover[] = [];
    let order = 1;

    // First, add members matching priority roles
    for (const priorityRole of APPROVER_ROLE_PRIORITY) {
      const matchingMember = members.find(m => 
        m.role?.toLowerCase().includes(priorityRole.toLowerCase()) ||
        priorityRole.toLowerCase().includes(m.role?.toLowerCase() || '')
      );

      if (matchingMember) {
        approverList.push({
          id: `approver-${matchingMember.id}`,
          role_name: matchingMember.role || priorityRole,
          display_order: order++,
          user_id: matchingMember.user_id,
          user_name: matchingMember.profile?.full_name,
          user_avatar: matchingMember.profile?.avatar_url,
        });
      }
    }

    // Add any lead members not already included
    const leadMembers = members.filter(m => 
      m.is_lead && !approverList.some(a => a.user_id === m.user_id)
    );

    for (const leadMember of leadMembers) {
      approverList.push({
        id: `approver-${leadMember.id}`,
        role_name: leadMember.role || 'Lead',
        display_order: order++,
        user_id: leadMember.user_id,
        user_name: leadMember.profile?.full_name,
        user_avatar: leadMember.profile?.avatar_url,
      });
    }

    // If no approvers found, use defaults
    if (approverList.length === 0) {
      onApproversChange(DEFAULT_APPROVERS);
    } else {
      onApproversChange(approverList);
    }
  };

  const handleAddApprover = () => {
    if (!newRoleName.trim()) return;

    const newApprover: WizardApprover = {
      id: `approver-${Date.now()}`,
      role_name: newRoleName.trim(),
      display_order: approvers.length + 1,
    };

    onApproversChange([...approvers, newApprover]);
    setNewRoleName('');
  };

  const handleRemoveApprover = (id: string) => {
    const updated = approvers
      .filter(a => a.id !== id)
      .map((a, i) => ({ ...a, display_order: i + 1 }));
    onApproversChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...approvers];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onApproversChange(updated.map((a, i) => ({ ...a, display_order: i + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === approvers.length - 1) return;
    const updated = [...approvers];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onApproversChange(updated.map((a, i) => ({ ...a, display_order: i + 1 })));
  };

  const handleRefreshFromTeam = () => {
    if (teamMembers.length > 0) {
      populateApproversFromTeam(teamMembers);
    } else {
      onApproversChange(DEFAULT_APPROVERS);
    }
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
            <strong>Sequential Approval:</strong> Each approver will receive a task notification 
            after the previous approver signs off. The plan becomes active once all approvers complete their review.
          </div>
        </div>
      </div>

      {/* Approvers List */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[240px]">
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : approvers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No approvers configured</p>
                <p className="text-xs mt-1">Add approvers manually or refresh from team</p>
              </div>
            ) : (
              approvers.map((approver, index) => (
                <div
                  key={approver.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex flex-col gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      disabled={index === approvers.length - 1}
                      onClick={() => handleMoveDown(index)}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {index + 1}
                  </div>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={approver.user_avatar} />
                    <AvatarFallback className="text-xs bg-muted">
                      {getInitials(approver.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    {approver.user_name ? (
                      <>
                        <span className="text-sm font-medium">{approver.user_name}</span>
                        <p className="text-xs text-muted-foreground truncate">
                          {approver.role_name}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-muted-foreground">{approver.role_name}</span>
                        <p className="text-[10px] text-amber-600">
                          No team member assigned
                        </p>
                      </>
                    )}
                  </div>
                  {approver.user_id && (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      Assigned
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => handleRemoveApprover(approver.id)}
                    disabled={approvers.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Add New Approver */}
      <div className="flex gap-2">
        <Input
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          placeholder="Enter role name (e.g., Safety Manager)"
          className="h-9 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleAddApprover()}
        />
        <Button
          size="sm"
          onClick={handleAddApprover}
          disabled={!newRoleName.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Summary */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="text-xs text-muted-foreground">
          <strong>{approvers.length}</strong> approvers in sequence. 
          Estimated review time: <strong>{approvers.length * 2}-{approvers.length * 5} days</strong>
        </div>
      </div>
    </div>
  );
};
