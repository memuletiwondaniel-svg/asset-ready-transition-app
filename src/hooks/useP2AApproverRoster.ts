import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProjectRoleUsers } from '@/hooks/useProjectRoleUsers';
import { FIXED_APPROVER_ROLES, type WizardApprover } from '@/components/widgets/p2a-wizard/steps/ApprovalSetupStep';

/**
 * Shared canonical resolver for the P2A approver roster.
 *
 * SINGLE source of truth used by both:
 *   - ApprovalSetupStep (wizard roster)
 *   - SubmissionSuccessDialog (post-submit / re-opened status modal fallback)
 *
 * Resolution rules (mirror the wizard exactly):
 *   - 4 project-team roles → `resolve_project_role_user` RPC via useProjectRoleUsers
 *   - Dep. Plant Director (plant-scoped) → `find_deputy_plant_director` RPC
 *
 * Keeping these two RPCs in ONE place prevents a divergence where one
 * consumer (e.g. the read path) loses a role the other (creation) keeps.
 */

const RPC_RESOLVED_LABELS = FIXED_APPROVER_ROLES
  .filter((r) => r.key !== 'deputy_plant_director')
  .map((r) => r.label);

export function useP2AApproverRoster(projectId?: string, plantNameInput?: string) {
  const { data: resolvedByLabel, isLoading: rolesLoading } = useProjectRoleUsers(
    projectId,
    RPC_RESOLVED_LABELS,
  );

  const [deputy, setDeputy] = useState<{ user_id: string; full_name: string; avatar_url?: string | null } | null>(null);
  const [deputyLoading, setDeputyLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!projectId) return;
      setDeputyLoading(true);
      try {
        let plantName = plantNameInput || null;
        if (!plantName) {
          const { data: project } = await supabase
            .from('projects')
            .select('plant_id')
            .eq('id', projectId)
            .single();
          if (project?.plant_id) {
            const { data: plant } = await supabase
              .from('plant')
              .select('name')
              .eq('id', project.plant_id)
              .single();
            plantName = plant?.name || null;
          }
        }
        if (!plantName) {
          if (!cancelled) setDeputy(null);
          return;
        }
        const { data } = await supabase.rpc('find_deputy_plant_director', {
          plant_name_param: plantName,
        });
        if (!cancelled) setDeputy((data as any)?.[0] ?? null);
      } catch (err) {
        console.error('[useP2AApproverRoster] deputy lookup failed:', err);
        if (!cancelled) setDeputy(null);
      } finally {
        if (!cancelled) setDeputyLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [projectId, plantNameInput]);

  const roster = useMemo<WizardApprover[]>(() => {
    if (!resolvedByLabel) return [];
    return FIXED_APPROVER_ROLES.map((role) => {
      if (role.key === 'deputy_plant_director') {
        return {
          id: `approver-${role.key}`,
          role_name: role.label,
          display_order: role.order,
          status: 'PENDING',
          user_id: deputy?.user_id,
          user_name: deputy?.full_name,
          user_avatar: deputy?.avatar_url ?? undefined,
        };
      }
      const r = resolvedByLabel[role.label] ?? null;
      return {
        id: `approver-${role.key}`,
        role_name: role.label,
        display_order: role.order,
        status: 'PENDING',
        user_id: r?.user_id,
        user_name: r?.full_name,
        user_avatar: r?.avatar_url ?? undefined,
      };
    });
  }, [resolvedByLabel, deputy]);

  return { roster, isLoading: rolesLoading || deputyLoading };
}
