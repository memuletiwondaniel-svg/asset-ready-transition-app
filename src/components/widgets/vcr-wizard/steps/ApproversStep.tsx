import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, X, Plus, RefreshCw } from 'lucide-react';

interface ApproversStepProps {
  vcrId: string;
}

interface ResolvedApprover {
  role: string;
  name: string;
  position: string;
  avatarUrl: string;
}

const getFullAvatarUrl = (avatarUrl: string | null) => {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const { data } = supabase.storage.from('user-avatars').getPublicUrl(avatarUrl);
  return data.publicUrl;
};

const getInitials = (name: string) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const DEFAULT_APPROVER_ROLES = [
  'Snr. ORA Engr.',
  'Commissioning Lead',
  'Construction Lead',
  'Project Hub Lead',
  'Deputy Plant Director',
];

const HUB_TO_REGION: Record<string, string[]> = {
  zubair: ['central', 'zubair'],
  north: ['north'],
  uq: ['uq'],
  'uq pipelines': ['uq', 'pipelines'],
  'uq full ref': ['uq'],
  'uq condensate chiller pkg': ['uq'],
  'uq train f package': ['uq'],
  'west qurna': ['west qurna'],
  'nrngl, bngl & nr/sr': ['nrngl', 'bngl', 'nr/sr', 'nrngl, bngl & nr/sr'],
  kaz: ['kaz'],
  pipelines: ['pipelines'],
  central: ['central'],
};

const getRegionKeywords = (hubName: string): string[] => {
  const lower = hubName.toLowerCase().trim();
  if (HUB_TO_REGION[lower]) return HUB_TO_REGION[lower];
  // Fallback: try matching partial hub names
  for (const [key, keywords] of Object.entries(HUB_TO_REGION)) {
    if (lower.includes(key) || key.includes(lower)) return keywords;
  }
  return [lower];
};

const posMatchesRegion = (pos: string, regionKeywords: string[]): boolean => {
  return regionKeywords.some(kw => pos.includes(kw));
};

export const ApproversStep: React.FC<ApproversStepProps> = ({ vcrId }) => {
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { data: approvers, isLoading, refetch, isFetching } = useQuery<ResolvedApprover[]>({
    queryKey: ['vcr-exec-plan-approvers', vcrId],
    queryFn: async () => {
      const client = supabase as any;

      const { data: hp } = await client
        .from('p2a_handover_points')
        .select('handover_plan_id')
        .eq('id', vcrId)
        .maybeSingle();

      let plantName = '';
      let hubName = '';
      if (hp?.handover_plan_id) {
        const { data: plan } = await client
          .from('p2a_handover_plans')
          .select('project_id')
          .eq('id', hp.handover_plan_id)
          .maybeSingle();
        if (plan?.project_id) {
          const { data: project } = await client
            .from('projects')
            .select('plant_id, hub_id')
            .eq('id', plan.project_id)
            .maybeSingle();
          if (project?.plant_id) {
            const { data: plant } = await client.from('plant').select('name').eq('id', project.plant_id).maybeSingle();
            plantName = plant?.name || '';
          }
          if (project?.hub_id) {
            const { data: hub } = await client.from('hubs').select('name').eq('id', project.hub_id).maybeSingle();
            hubName = hub?.name || '';
          }
        }
      }

      const { data: allProfiles } = await client
        .from('profiles')
        .select('user_id, full_name, avatar_url, position')
        .eq('is_active', true);
      if (!allProfiles) return [];

      const plantLower = plantName.toLowerCase();
      const regionKeywords = hubName ? getRegionKeywords(hubName) : [];

      return DEFAULT_APPROVER_ROLES.map((role) => {
        const candidates = allProfiles.filter((p: any) => {
          const pos = (p.position || '').toLowerCase().replace(/–/g, '-').replace(/—/g, '-');

          if (role === 'Snr. ORA Engr.') {
            return pos.includes('ora') && (pos.includes('snr') || pos.includes('senior')) && pos.includes('engr');
          }
          if (role === 'Commissioning Lead') {
            return (pos.includes('commissioning') || pos.includes('csu')) && pos.includes('lead');
          }
          if (role === 'Construction Lead') {
            return pos.includes('construction') && pos.includes('lead');
          }
          if (role === 'Project Hub Lead') {
            return pos.includes('project hub lead');
          }
          if (role === 'Deputy Plant Director') {
            return (pos.includes('deputy') || pos.includes('dep.')) && pos.includes('plant') && pos.includes('director') && (plantLower ? pos.includes(plantLower) : true);
          }
          return false;
        });

        let match: any = null;
        if (candidates.length === 1) {
          match = candidates[0];
        } else if (candidates.length > 1 && regionKeywords.length > 0) {
          const regionMatches = candidates.filter((p: any) => {
            const pos = (p.position || '').toLowerCase().replace(/–/g, '-').replace(/—/g, '-');
            return posMatchesRegion(pos, regionKeywords);
          });
          const pool = regionMatches.length > 0 ? regionMatches : candidates;
          match = pool.find((p: any) => p.avatar_url) || pool[0];
        } else if (candidates.length > 1) {
          match = candidates.find((p: any) => p.avatar_url) || candidates[0];
        }

        return {
          role,
          name: match?.full_name || '',
          position: match?.position || role,
          avatarUrl: getFullAvatarUrl(match?.avatar_url || null),
        };
      });
    },
  });

  const visibleApprovers = approvers?.filter((_, idx) => !removedIndices.has(idx)) || [];
  const totalResolved = visibleApprovers.filter(a => a.name).length;

  const handleRemove = (originalIdx: number) => {
    setRemovedIndices(prev => new Set(prev).add(originalIdx));
  };

  const handleAdd = () => {
    // TODO: open a picker to add a new approver
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>{totalResolved} of {visibleApprovers.length} approvers resolved</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Resync approvers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleAdd}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {approvers?.map((approver, idx) => {
          if (removedIndices.has(idx)) return null;
          const seqNum = approvers.slice(0, idx + 1).filter((_, i) => !removedIndices.has(i)).length;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={`${approver.role}-${idx}`}
              className="group flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Sequence number */}
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-muted-foreground">{seqNum}</span>
              </div>

              {/* Avatar */}
              <Avatar className="w-9 h-9 shrink-0">
                {approver.avatarUrl && <AvatarImage src={approver.avatarUrl} alt={approver.name} />}
                <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                  {getInitials(approver.name)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {approver.name || <span className="italic text-muted-foreground">Unassigned</span>}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{approver.position}</div>
              </div>

              {/* Delete button on hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(idx);
                }}
                className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                  isHovered
                    ? 'opacity-100 bg-destructive/10 text-destructive hover:bg-destructive/20'
                    : 'opacity-0 pointer-events-none'
                }`}
                title="Remove approver"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
