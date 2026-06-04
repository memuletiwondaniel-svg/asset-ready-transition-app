import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, RefreshCw, Trash2, Plus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useProjectRoleUsers } from '@/hooks/useProjectRoleUsers';
import {
  P2A_AND_VCR_APPROVER_ROLES,
  DEPUTY_DIRECTOR_KEY,
  rpcResolvedLabels,
} from '@/components/widgets/shared/wizardApproverRoles';

interface ApproversStepProps {
  vcrId: string;
}

interface VCRApprover {
  id: string;
  role_name: string;
  display_order: number;
  user_id?: string;
  user_name?: string;
  user_avatar?: string;
}

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const resolveAvatarUrl = (avatarUrl?: string): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

const FIXED_ROLES = P2A_AND_VCR_APPROVER_ROLES;
const RPC_LABELS = rpcResolvedLabels(FIXED_ROLES);

export const ApproversStep: React.FC<ApproversStepProps> = ({ vcrId }) => {
  const [approvers, setApprovers] = useState<VCRApprover[]>([]);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const { data: allProfileUsers } = useProfileUsers();

  // Resolve VCR → project + plant
  const { data: ctx } = useQuery({
    queryKey: ['vcr-approvers-ctx', vcrId],
    queryFn: async () => {
      const client = supabase as any;
      const { data: hp } = await client
        .from('p2a_handover_points')
        .select('handover_plan_id')
        .eq('id', vcrId)
        .maybeSingle();
      if (!hp?.handover_plan_id) return { projectId: '', plantName: '' };
      const { data: plan } = await client
        .from('p2a_handover_plans')
        .select('project_id')
        .eq('id', hp.handover_plan_id)
        .maybeSingle();
      const projectId: string = plan?.project_id ?? '';
      let plantName = '';
      if (projectId) {
        const { data: project } = await client
          .from('projects')
          .select('plant_id')
          .eq('id', projectId)
          .maybeSingle();
        if (project?.plant_id) {
          const { data: plant } = await client
            .from('plant')
            .select('name')
            .eq('id', project.plant_id)
            .maybeSingle();
          plantName = plant?.name || '';
        }
      }
      return { projectId, plantName };
    },
  });

  const projectId = ctx?.projectId;
  const plantName = ctx?.plantName;

  const {
    data: resolvedByLabel,
    isLoading: rolesLoading,
    isFetching: rolesFetching,
    refetch: refetchRoles,
  } = useProjectRoleUsers(projectId, RPC_LABELS);

  // Deputy Plant Director via canonical RPC (plant-scoped)
  const [deputyDirector, setDeputyDirector] = useState<
    { user_id: string; full_name: string; avatar_url?: string | null } | null
  >(null);
  const [deputyLoading, setDeputyLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!plantName) {
        setDeputyDirector(null);
        return;
      }
      setDeputyLoading(true);
      try {
        const { data: deputies } = await (supabase as any).rpc(
          'find_deputy_plant_director',
          { plant_name_param: plantName },
        );
        if (!cancelled) setDeputyDirector(deputies?.[0] ?? null);
      } catch (err) {
        console.error('[VCR Approvers] Deputy lookup failed:', err);
        if (!cancelled) setDeputyDirector(null);
      } finally {
        if (!cancelled) setDeputyLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [plantName]);

  const isLoading = rolesLoading || deputyLoading || !ctx;

  // Build canonical default approver list
  const canonicalApprovers = useMemo<VCRApprover[]>(() => {
    if (!resolvedByLabel) return [];
    return FIXED_ROLES.map((role) => {
      if (role.key === DEPUTY_DIRECTOR_KEY) {
        return {
          id: `vcr-approver-${role.key}`,
          role_name: role.label,
          display_order: role.order,
          user_id: deputyDirector?.user_id,
          user_name: deputyDirector?.full_name,
          user_avatar: deputyDirector?.avatar_url ?? undefined,
        };
      }
      const resolved = resolvedByLabel[role.label] ?? null;
      return {
        id: `vcr-approver-${role.key}`,
        role_name: role.label,
        display_order: role.order,
        user_id: resolved?.user_id,
        user_name: resolved?.full_name,
        user_avatar: resolved?.avatar_url ?? undefined,
      };
    });
  }, [resolvedByLabel, deputyDirector]);

  // Seed local state once canonical list is ready (no persistence yet —
  // Phase C will add the vcr_plan_approvers table and replace this with
  // a saved-list reconciliation pattern, mirroring P2A's enrich-in-place).
  useEffect(() => {
    if (isLoading || canonicalApprovers.length === 0) return;
    setApprovers(prev => {
      if (prev.length === 0) return canonicalApprovers;
      // Enrich-in-place
      const fixedLabels = new Set(FIXED_ROLES.map(r => r.label));
      return prev.map(a => {
        if (!fixedLabels.has(a.role_name)) return a;
        const canon = canonicalApprovers.find(c => c.role_name === a.role_name);
        if (!canon) return a;
        if (!a.user_id && canon.user_id) {
          return { ...a, user_id: canon.user_id, user_name: canon.user_name, user_avatar: canon.user_avatar };
        }
        return a;
      });
    });
  }, [isLoading, canonicalApprovers]);

  const handleRefresh = () => {
    refetchRoles();
    setApprovers(canonicalApprovers);
  };

  const handleDelete = (id: string) => {
    setApprovers(prev => prev.filter(a => a.id !== id));
  };

  const handleAdd = () => {
    const maxOrder = approvers.reduce((m, a) => Math.max(m, a.display_order), 0);
    setApprovers(prev => [
      ...prev,
      {
        id: `vcr-approver-custom-${Date.now()}`,
        role_name: newRoleName.trim() || 'New Approver',
        display_order: maxOrder + 1,
      },
    ]);
    setNewRoleName('');
    setShowAddRow(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-9 h-9 rounded-full" />
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
          onClick={handleRefresh}
          className="text-xs gap-1"
          disabled={rolesFetching}
        >
          {rolesFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </Button>
      </div>

      <div className="space-y-2 ml-4">
        {approvers.map((approver) => {
          const hasUser = !!approver.user_id;

          // B2B partner detection (mirrors P2A)
          let partner: { user_id: string; full_name: string; avatar_url?: string; position?: string } | null = null;
          if (hasUser && allProfileUsers) {
            const normalize = (p?: string | null) => (p || '').toLowerCase().replace(/\s+/g, ' ').trim();
            const me = allProfileUsers.find((u: any) => u.user_id === approver.user_id);
            const myPos = normalize(me?.position);
            if (myPos) {
              const sharing = allProfileUsers.filter((u: any) => normalize(u.position) === myPos);
              const others = sharing.filter((u: any) => u.user_id !== approver.user_id);
              if (sharing.length === 2 && others.length === 1) {
                partner = others[0];
              }
            }
          }

          return (
            <div
              key={approver.id}
              className="group flex items-center gap-3 p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 hover:border-primary/40 hover:shadow-md hover:-translate-y-px transition-all duration-200 max-w-md cursor-default"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={resolveAvatarUrl(approver.user_avatar)} />
                <AvatarFallback className="text-xs bg-muted">
                  {getInitials(approver.user_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {hasUser ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{approver.user_name}</span>
                      {partner && (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setApprovers(prev => prev.map(a =>
                                    a.id === approver.id
                                      ? {
                                          ...a,
                                          user_id: partner!.user_id,
                                          user_name: partner!.full_name,
                                          user_avatar: partner!.avatar_url,
                                        }
                                      : a
                                  ));
                                }}
                                className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 hover:bg-amber-200 dark:hover:bg-amber-900/60 cursor-pointer transition-colors"
                                title={`Switch to B2B: ${partner.full_name}`}
                              >
                                B2B
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="start" sideOffset={4} className="text-xs">
                              Click to switch to B2B: {partner.full_name}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
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
                  onClick={() => handleDelete(approver.id)}
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
                if (e.key === 'Enter' && newRoleName.trim()) handleAdd();
                if (e.key === 'Escape') { setShowAddRow(false); setNewRoleName(''); }
              }}
            />
            <Button size="sm" onClick={handleAdd} disabled={!newRoleName.trim()}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAddRow(false); setNewRoleName(''); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs mt-1 text-muted-foreground border border-dashed border-border/70 hover:text-primary-foreground hover:bg-primary hover:border-primary hover:shadow-sm transition-all"
            onClick={() => setShowAddRow(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Approver
          </Button>
        )}
      </div>
    </div>
  );
};
