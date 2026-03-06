import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Plus, X, Loader2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardApprover {
  user_id: string;
  full_name: string;
  position: string | null;
  avatar_url: string | null;
  role_label: string; // e.g. 'ORA Lead', 'Project Hub Lead'
}

interface Props {
  approvers: WizardApprover[];
  onApproversChange: (approvers: WizardApprover[]) => void;
  projectId: string;
}

const DEFAULT_ROLES = ['ORA Lead', 'Project Hub Lead'];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const StepApprovers: React.FC<Props> = ({ approvers, onApproversChange, projectId }) => {
  // Resolve default approvers from profiles
  const { data: resolvedDefaults, isLoading } = useQuery({
    queryKey: ['ora-plan-approver-resolution', projectId],
    queryFn: async () => {
      const results: WizardApprover[] = [];

      for (const role of DEFAULT_ROLES) {
        // First try project team members
        const { data: teamMembers } = await supabase
          .from('project_team_members')
          .select('user_id, role')
          .eq('project_id', projectId)
          .ilike('role', `%${role}%`);

        if (teamMembers && teamMembers.length > 0) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, position')
            .eq('user_id', teamMembers[0].user_id)
            .single();

          if (profile) {
            results.push({
              user_id: profile.user_id,
              full_name: profile.full_name || 'Unknown',
              position: profile.position,
              avatar_url: profile.avatar_url,
              role_label: role,
            });
            continue;
          }
        }

        // Fallback: resolve from profiles by position
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, position')
          .eq('is_active', true)
          .ilike('position', `%${role.replace(' Lead', '').replace('Project Hub', 'Hub')}%`)
          .limit(5);

        if (profiles && profiles.length > 0) {
          const best = profiles[0];
          results.push({
            user_id: best.user_id,
            full_name: best.full_name || 'Unknown',
            position: best.position,
            avatar_url: best.avatar_url,
            role_label: role,
          });
        }
      }

      return results;
    },
  });

  // Auto-populate on first load
  useEffect(() => {
    if (resolvedDefaults && approvers.length === 0) {
      onApproversChange(resolvedDefaults);
    }
  }, [resolvedDefaults]);

  // Fetch all active profiles for "Add Approver" popover
  const { data: allProfiles } = useQuery({
    queryKey: ['all-active-profiles-for-approvers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, position')
        .eq('is_active', true)
        .order('full_name');
      return data || [];
    },
  });

  const removeApprover = (userId: string) => {
    onApproversChange(approvers.filter((a) => a.user_id !== userId));
  };

  const addApprover = (profile: { user_id: string; full_name: string; avatar_url: string | null; position: string | null }) => {
    if (approvers.some((a) => a.user_id === profile.user_id)) return;
    onApproversChange([
      ...approvers,
      {
        user_id: profile.user_id,
        full_name: profile.full_name || 'Unknown',
        position: profile.position,
        avatar_url: profile.avatar_url,
        role_label: 'Approver',
      },
    ]);
  };

  const availableProfiles = (allProfiles || []).filter(
    (p) => !approvers.some((a) => a.user_id === p.user_id)
  );

  return (
    <div className="space-y-5 p-1">
      <div className="text-center space-y-2 pb-2">
        <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold">Plan Approvers</h3>
        <p className="text-sm text-muted-foreground">
          Select who will review and approve this ORA Plan.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Resolving approvers...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {approvers.map((approver) => (
            <Card key={approver.user_id} className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={approver.avatar_url || undefined} alt={approver.full_name} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {getInitials(approver.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{approver.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{approver.position || 'No position'}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {approver.role_label}
                </Badge>
                <button
                  onClick={() => removeApprover(approver.user_id)}
                  className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}

          {approvers.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              No approvers selected. Add at least one approver.
            </div>
          )}

          {/* Add Approver */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2 border-dashed">
                <Plus className="w-4 h-4" />
                Add Approver
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="center">
              <div className="p-3 border-b">
                <p className="text-sm font-medium">Select a person</p>
              </div>
              <ScrollArea className="h-60">
                <div className="p-1">
                  {availableProfiles.map((profile) => (
                    <button
                      key={profile.user_id}
                      onClick={() => addApprover(profile)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-muted">
                          {getInitials(profile.full_name || '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{profile.full_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{profile.position || '—'}</p>
                      </div>
                    </button>
                  ))}
                  {availableProfiles.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No more profiles available</p>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};
