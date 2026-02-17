import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, CheckCircle2 } from 'lucide-react';

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

// Hub names don't always match region suffixes in position titles.
// e.g. Hub "Zubair" → positions use "Central"; Hub "UQ" → "UQ", etc.
const HUB_TO_REGION: Record<string, string[]> = {
  zubair: ['central'],
  north: ['north'],
  uq: ['uq'],
  'west qurna': ['west qurna'],
  'nrngl, bngl & nr/sr': ['nrngl', 'bngl'],
  kaz: ['kaz'],
  pipelines: ['pipelines'],
  central: ['central'],
};

/**
 * Get the region keywords to match in position strings for a given hub name.
 * Falls back to the hub name itself if no explicit mapping exists.
 */
const getRegionKeywords = (hubName: string): string[] => {
  const lower = hubName.toLowerCase();
  return HUB_TO_REGION[lower] || [lower];
};

/**
 * Check if a position string contains any of the region keywords.
 */
const posMatchesRegion = (pos: string, regionKeywords: string[]): boolean => {
  return regionKeywords.some(kw => pos.includes(kw));
};

export const ApproversStep: React.FC<ApproversStepProps> = ({ vcrId }) => {
  const { data: approvers, isLoading } = useQuery<ResolvedApprover[]>({
    queryKey: ['vcr-exec-plan-approvers', vcrId],
    queryFn: async () => {
      const client = supabase as any;

      // Resolve project context from VCR
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
        // Find ALL candidates, then pick the best one
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
            // Hub Lead must match exact hub name (e.g. "Zubair")
            const hubLower = hubName.toLowerCase();
            return pos.includes('project hub lead') && (hubLower ? pos.includes(hubLower) : true);
          }
          if (role === 'Deputy Plant Director') {
            return (pos.includes('deputy') || pos.includes('dep.')) && pos.includes('plant') && pos.includes('director') && (plantLower ? pos.includes(plantLower) : true);
          }
          return false;
        });

        // For roles that use region (not hub name directly), rank by region match + avatar
        let match: any = null;
        if (candidates.length === 1) {
          match = candidates[0];
        } else if (candidates.length > 1 && regionKeywords.length > 0) {
          // Prefer candidates whose position matches the region
          const regionMatches = candidates.filter((p: any) => {
            const pos = (p.position || '').toLowerCase().replace(/–/g, '-').replace(/—/g, '-');
            return posMatchesRegion(pos, regionKeywords);
          });
          const pool = regionMatches.length > 0 ? regionMatches : candidates;
          // Tiebreak: prefer candidate with avatar
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span>{approvers?.filter(a => a.name).length || 0} of {DEFAULT_APPROVER_ROLES.length} approvers resolved</span>
      </div>

      <div className="space-y-1">
        {approvers?.map((approver, idx) => (
          <div
            key={approver.role}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors"
          >
            {/* Sequence number */}
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground">{idx + 1}</span>
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

            {/* Role badge */}
            <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
              {approver.role}
            </Badge>

            {/* Resolved indicator */}
            {approver.name && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
