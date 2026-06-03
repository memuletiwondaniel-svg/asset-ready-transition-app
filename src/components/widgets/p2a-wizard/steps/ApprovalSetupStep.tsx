import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useProjectRoleUsers } from '@/hooks/useProjectRoleUsers';

export interface WizardApprover {
  id: string;
  role_name: string;
  display_order: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  user_id?: string;
  user_name?: string;
  user_avatar?: string;
}

/**
 * Fixed approval sequence – hardcoded, not user-reorderable.
 * Phase 1 (parallel): ORA Lead, Construction Lead, Commissioning Lead
 * Phase 2 (after Phase 1): Project Hub Lead, Dep. Plant Director
 *
 * Labels MUST be byte-identical to roles.name (Mig 5c validator) — they
 * are passed directly to the shared `resolve_project_role_user` RPC via
 * the `useProjectRoleUsers` hook. NO private label/synonym matching
 * lives in this component: who-holds-role-X-on-project-Y is decided in
 * exactly one place (the RPC), shared with backend triggers.
 */
export const FIXED_APPROVER_ROLES = [
  { key: 'ora_lead', label: 'ORA Lead', order: 1, phase: 1 },
  { key: 'construction_lead', label: 'Construction Lead', order: 2, phase: 1 },
  { key: 'commissioning_lead', label: 'Commissioning Lead', order: 3, phase: 1 },
  { key: 'hub_lead', label: 'Project Hub Lead', order: 4, phase: 2 },
  { key: 'deputy_plant_director', label: 'Dep. Plant Director', order: 5, phase: 2 },
] as const;

// Labels we resolve via the shared RPC. Deputy Plant Director is
// plant-scoped (not project-team-scoped) and uses its own canonical
// SECURITY DEFINER RPC `find_deputy_plant_director` — also a shared
// path, not a private matcher.
const RPC_RESOLVED_LABELS = FIXED_APPROVER_ROLES
  .filter((r) => r.key !== 'deputy_plant_director')
  .map((r) => r.label);



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
  const { data: allProfileUsers } = useProfileUsers();
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Shared canonical resolver — same RPC as backend triggers.
  const {
    data: resolvedByLabel,
    isLoading: rolesLoading,
    refetch: refetchRoles,
  } = useProjectRoleUsers(projectId, RPC_RESOLVED_LABELS);

  // Deputy Plant Director is plant-scoped, not project-team-scoped.
  // Resolved via the canonical `find_deputy_plant_director` SECURITY DEFINER
  // RPC (shared path — no private label matching here either).
  const [deputyDirector, setDeputyDirector] = useState<
    { user_id: string; full_name: string; avatar_url?: string | null } | null
  >(null);
  const [deputyLoading, setDeputyLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!projectId) return;
      setDeputyLoading(true);
      try {
        let resolvedPlantName = plantName || null;
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
        if (!resolvedPlantName) {
          if (!cancelled) setDeputyDirector(null);
          return;
        }
        const { data: deputies } = await supabase.rpc(
          'find_deputy_plant_director',
          { plant_name_param: resolvedPlantName },
        );
        if (cancelled) return;
        setDeputyDirector(deputies?.[0] ?? null);
      } catch (err) {
        console.error('[P2A Approval] Deputy lookup failed:', err);
        if (!cancelled) setDeputyDirector(null);
      } finally {
        if (!cancelled) setDeputyLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [projectId, plantName]);

  const isLoading = rolesLoading || deputyLoading;

  // Build the canonical approver list from the shared resolver.
  const canonicalApprovers = useMemo<WizardApprover[]>(() => {
    if (!resolvedByLabel) return [];
    return FIXED_APPROVER_ROLES.map((role) => {
      if (role.key === 'deputy_plant_director') {
        return {
          id: `approver-${role.key}`,
          role_name: role.label,
          display_order: role.order,
          user_id: deputyDirector?.user_id,
          user_name: deputyDirector?.full_name,
          user_avatar: deputyDirector?.avatar_url ?? undefined,
        };
      }
      const resolved = resolvedByLabel[role.label] ?? null;
      return {
        id: `approver-${role.key}`,
        role_name: role.label,
        display_order: role.order,
        user_id: resolved?.user_id,
        user_name: resolved?.full_name,
        user_avatar: resolved?.avatar_url ?? undefined,
      };
    });
  }, [resolvedByLabel, deputyDirector]);

  // Sync resolver output → wizard state. Repopulates on first load, when
  // existing approvers are stale (duplicate fixed-role labels), or when
  // a slot is missing its resolved user. Custom approvers added by the
  // user (role_name not in FIXED_APPROVER_ROLES) are preserved.
  useEffect(() => {
    if (isLoading || canonicalApprovers.length === 0) return;
    const fixedLabels = new Set<string>(FIXED_APPROVER_ROLES.map((r) => r.label));

    const fixedSlotsInCurrent = approvers.filter((a) => fixedLabels.has(a.role_name));
    const labelsSeen = fixedSlotsInCurrent.map((a) => a.role_name);
    const hasDuplicates = new Set(labelsSeen).size !== labelsSeen.length;
    const missingFixed = FIXED_APPROVER_ROLES.some(
      (r) => !fixedSlotsInCurrent.some((a) => a.role_name === r.label),
    );

    const needsRepopulate =
      approvers.length === 0 || hasDuplicates || missingFixed;

    if (needsRepopulate) {
      const customs = approvers.filter((a) => !fixedLabels.has(a.role_name));
      onApproversChange([...canonicalApprovers, ...customs]);
      return;
    }

    // Enrich-in-place: fill missing user_id / user_name on fixed slots
    // from the canonical resolver without resetting custom approvers
    // or wiping existing assignments.
    let mutated = false;
    const enriched = approvers.map((a) => {
      if (!fixedLabels.has(a.role_name)) return a;
      const canon = canonicalApprovers.find((c) => c.role_name === a.role_name);
      if (!canon) return a;
      if (!a.user_id && canon.user_id) {
        mutated = true;
        return { ...a, user_id: canon.user_id, user_name: canon.user_name, user_avatar: canon.user_avatar };
      }
      if (a.user_id && !a.user_name && canon.user_id === a.user_id) {
        mutated = true;
        return { ...a, user_name: canon.user_name, user_avatar: canon.user_avatar };
      }
      return a;
    });
    if (mutated) onApproversChange(enriched);
  }, [isLoading, canonicalApprovers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefreshFromTeam = () => {
    refetchRoles();
    // Re-trigger deputy lookup by toggling effect via projectId dep is not
    // possible; instead, force a fresh resolve here.
    onApproversChange(canonicalApprovers);
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

            // ── B2B partner detection ──
            // Mirrors the resolver pattern used in WizardStepProjectTeam:
            // if exactly one other active user shares this user's exact position
            // (normalized), treat them as the B2B counterpart and allow a swap.
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
                                    const next = approvers.map(a =>
                                      a.id === approver.id
                                        ? {
                                            ...a,
                                            user_id: partner!.user_id,
                                            user_name: partner!.full_name,
                                            user_avatar: partner!.avatar_url,
                                          }
                                        : a
                                    );
                                    onApproversChange(next);
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
      )}
    </div>
  );
};
