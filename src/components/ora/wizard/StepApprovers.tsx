import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRegionKeywords } from '@/utils/hubRegionMapping';

const getFullAvatarUrl = (avatarUrl: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

export interface WizardApprover {
  user_id: string;
  full_name: string;
  position: string | null;
  avatar_url: string | null;
  role_label: string;
}

interface Props {
  approvers: WizardApprover[];
  onApproversChange: (approvers: WizardApprover[]) => void;
  projectId: string;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export const StepApprovers: React.FC<Props> = ({ approvers, onApproversChange, projectId }) => {
  // Resolve project location → plant + hub
  const { data: projectCtx } = useQuery({
    queryKey: ['ora-plan-project-ctx', projectId],
    queryFn: async () => {
      const { data: project } = await supabase
        .from('projects')
        .select('plant_id, hub_id')
        .eq('id', projectId)
        .maybeSingle();
      if (!project) return null;
      const [plantRes, hubRes] = await Promise.all([
        project.plant_id ? supabase.from('plant').select('name').eq('id', project.plant_id).maybeSingle() : Promise.resolve({ data: null }),
        project.hub_id ? supabase.from('hubs').select('name').eq('id', project.hub_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return {
        plantId: project.plant_id,
        hubId: project.hub_id,
        plantName: (plantRes.data as any)?.name || null,
        hubName: (hubRes.data as any)?.name || null,
      };
    },
  });

  // Resolve the 3 default approvers
  const { data: resolvedDefaults, isLoading } = useQuery({
    queryKey: ['ora-plan-default-approvers', projectId, projectCtx?.plantId, projectCtx?.hubId],
    enabled: !!projectCtx,
    queryFn: async () => {
      const plantName = (projectCtx?.plantName || '').toLowerCase();
      const hubName = (projectCtx?.hubName || '').toLowerCase();
      const hubKeywords = hubName ? getRegionKeywords(hubName) : [];

      // Deputy Plant Director — match by plant
      const { data: dpdCandidates } = await supabase
        .from('profiles')
        .select('user_id, full_name, position, avatar_url')
        .eq('is_active', true)
        .or('position.ilike.%Dep%Plant Director%,position.ilike.%Deputy Plant Director%');
      const dpd = (dpdCandidates || []).find(p => {
        const pos = (p.position || '').toLowerCase();
        if (!plantName) return true;
        return pos.includes(plantName) || plantName.split(' ').some(t => t.length > 2 && pos.includes(t));
      }) || (dpdCandidates || [])[0];

      // Project Hub Lead — match by hub
      const { data: hlCandidates } = await supabase
        .from('profiles')
        .select('user_id, full_name, position, avatar_url, hub')
        .eq('is_active', true)
        .or('position.ilike.%Hub Lead%,position.ilike.%Project Hub Lead%');
      const hl = (hlCandidates || []).find(p => {
        if (projectCtx?.hubId && (p as any).hub === projectCtx.hubId) return true;
        const pos = (p.position || '').toLowerCase();
        return hubKeywords.some(kw => pos.includes(kw));
      }) || (hlCandidates || [])[0];

      // ORA Lead — single ORA Lead (Roaa). Match exact "ORA Lead" position, exclude Snr/Sr
      const { data: oraCandidates } = await supabase
        .from('profiles')
        .select('user_id, full_name, position, avatar_url')
        .eq('is_active', true)
        .ilike('position', '%ORA Lead%');
      const ora = (oraCandidates || []).find(p => {
        const pos = (p.position || '').toLowerCase().trim();
        if (pos.includes('engr') || pos.includes('engineer')) return false;
        if (pos.includes('snr') || pos.includes('sr ') || pos.includes('senior')) return false;
        return pos.includes('ora lead');
      }) || (oraCandidates || []).find(p => (p.full_name || '').toLowerCase().includes('roaa'));

      // Order: 1) ORA Lead, 2) Project Hub Lead, 3) Deputy Plant Director
      const results: WizardApprover[] = [];
      if (ora) results.push({
        user_id: ora.user_id, full_name: ora.full_name || 'Unknown',
        position: ora.position, avatar_url: ora.avatar_url,
        role_label: 'ORA Lead',
      });
      if (hl) results.push({
        user_id: hl.user_id, full_name: hl.full_name || 'Unknown',
        position: hl.position, avatar_url: hl.avatar_url,
        role_label: 'Project Hub Lead',
      });
      if (dpd) results.push({
        user_id: dpd.user_id, full_name: dpd.full_name || 'Unknown',
        position: dpd.position, avatar_url: dpd.avatar_url,
        role_label: 'Deputy Plant Director',
      });

      return results;
    },

  });

  // Auto-populate on first load
  useEffect(() => {
    if (resolvedDefaults && approvers.length === 0 && resolvedDefaults.length > 0) {
      onApproversChange(resolvedDefaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedDefaults]);

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
    <div className="space-y-3 p-1">
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold">Select approvers</h3>
        <p className="text-xs text-muted-foreground">
          We've pre-populated the default approval chain. Add or remove as needed.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">Resolving approvers…</span>
        </div>
      ) : (
        <div className="space-y-2">
          {approvers.map((approver) => (
            <div
              key={approver.user_id}
              className="group flex items-center gap-3 px-3.5 py-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={getFullAvatarUrl(approver.avatar_url)} alt={approver.full_name} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  {getInitials(approver.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{approver.full_name}</p>
                <p className="text-xs text-primary font-medium truncate mt-0.5">{approver.position || approver.role_label}</p>
              </div>
              <button
                onClick={() => removeApprover(approver.user_id)}
                className="shrink-0 p-1.5 rounded text-destructive hover:bg-destructive/10 transition-opacity opacity-0 group-hover:opacity-100"
                aria-label="Remove approver"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {approvers.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
              No approvers selected. Add at least one approver.
            </div>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-1.5 border-dashed h-8 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Add Approver
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="center">
              <div className="p-2 border-b">
                <p className="text-xs font-medium">Select a person</p>
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
                        <AvatarImage src={getFullAvatarUrl(profile.avatar_url)} />
                        <AvatarFallback className="text-[10px] bg-muted">
                          {getInitials(profile.full_name || '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{profile.full_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{profile.position || '—'}</p>
                      </div>
                    </button>
                  ))}
                  {availableProfiles.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No more profiles available</p>
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
