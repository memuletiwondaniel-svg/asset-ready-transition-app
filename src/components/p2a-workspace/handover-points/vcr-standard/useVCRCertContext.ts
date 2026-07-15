import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves the header fields the VCR PAC / SoF certificates need:
 *   - projectName  (`projects.project_title`)
 *   - projectPrefix (`{project_id_prefix}-{project_id_number}` or `p2a_handover_plans.project_code` fallback)
 *   - plantName    (`plant.name` via `projects.plant_id`)
 *
 * Groundwork report B4/B5 called out that the previous certificate wiring
 * dropped these — this hook is the single resolution path used by both
 * `StandardPACTab` and `StandardSOFTab`.
 */
export function useVCRCertContext(handoverPlanId: string | undefined) {
  return useQuery({
    queryKey: ['vcr-cert-context', handoverPlanId],
    enabled: !!handoverPlanId,
    staleTime: 60_000,
    queryFn: async () => {
      const c = supabase as any;
      const planRes = await c
        .from('p2a_handover_plans')
        .select('project_id, project_code')
        .eq('id', handoverPlanId)
        .maybeSingle();
      const plan = planRes.data;
      if (!plan?.project_id) {
        return {
          projectName: null as string | null,
          projectPrefix: (plan?.project_code as string) || null,
          plantName: null as string | null,
          projectId: null as string | null,
        };
      }
      const projRes = await c
        .from('projects')
        .select('project_title, project_id_prefix, project_id_number, plant_id')
        .eq('id', plan.project_id)
        .maybeSingle();
      const pj = projRes.data;
      const derivedPrefix = pj?.project_id_prefix && pj?.project_id_number
        ? `${pj.project_id_prefix}-${pj.project_id_number}`
        : null;
      let plantName: string | null = null;
      if (pj?.plant_id) {
        const plantRes = await c.from('plant').select('name').eq('id', pj.plant_id).maybeSingle();
        plantName = (plantRes.data?.name as string) || null;
      }
      return {
        projectName: (pj?.project_title as string) || null,
        projectPrefix: (plan.project_code as string) || derivedPrefix,
        plantName,
        projectId: plan.project_id as string,
      };
    },
  });
}
