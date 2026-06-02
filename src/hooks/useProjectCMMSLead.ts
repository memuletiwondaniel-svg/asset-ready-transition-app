import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves the CMMS Lead for the project that owns a given VCR.
 *
 * Uses the same `resolve_project_role_user` RPC path that the task fan-out
 * triggers use, so the UI and downstream task assignment agree on who the
 * CMMS Lead is. The canonical role label is 'CMMS Lead'.
 *
 * Cardinality: `resolve_project_role_user` returns a single uuid (LIMIT 1),
 * so we treat CMMS Lead as one-per-project. If multiple rows exist in
 * project_team_members for that role on a project, this hook surfaces the
 * same lead the fan-out will assign.
 */
export interface CMMSLead {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export function useProjectCMMSLead(vcrId: string | undefined) {
  return useQuery({
    enabled: !!vcrId,
    queryKey: ['project-cmms-lead', vcrId],
    queryFn: async (): Promise<CMMSLead | null> => {
      const client = supabase as any;

      // vcr → handover_plan → project_id
      const vcrRes = await client
        .from('p2a_handover_points')
        .select('handover_plan_id')
        .eq('id', vcrId)
        .maybeSingle();
      if (vcrRes.error) throw vcrRes.error;
      const planId = vcrRes.data?.handover_plan_id;
      if (!planId) return null;

      const planRes = await client
        .from('p2a_handover_plans')
        .select('project_id')
        .eq('id', planId)
        .maybeSingle();
      if (planRes.error) throw planRes.error;
      const projectId = planRes.data?.project_id;
      if (!projectId) return null;

      // Same resolver the fan-out uses
      const rpc = await client.rpc('resolve_project_role_user', {
        p_project_id: projectId,
        p_role_label: 'CMMS Lead',
      });
      if (rpc.error) throw rpc.error;
      const userId: string | null = rpc.data ?? null;
      if (!userId) return null;

      const prof = await client
        .from('profiles')
        .select('id, full_name, first_name, last_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();
      if (prof.error) throw prof.error;
      if (!prof.data) return null;

      const full =
        prof.data.full_name?.trim() ||
        [prof.data.first_name, prof.data.last_name].filter(Boolean).join(' ').trim() ||
        'CMMS Lead';

      return {
        user_id: prof.data.id,
        full_name: full,
        avatar_url: prof.data.avatar_url ?? null,
      };
    },
  });
}
