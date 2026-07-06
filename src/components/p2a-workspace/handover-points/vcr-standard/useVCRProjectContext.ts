import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch project title + project code for a VCR via handover plan.
 * Powers the D2 subtitle: "DP-300: HM Additional Compressors - Verification Certificate of Readiness".
 */
export function useVCRProjectContext(handoverPlanId: string | undefined) {
  return useQuery({
    queryKey: ['vcr-project-context', handoverPlanId],
    enabled: !!handoverPlanId,
    queryFn: async () => {
      const client = supabase as any;
      const { data: plan } = await client
        .from('p2a_handover_plans')
        .select('project_id, project_code')
        .eq('id', handoverPlanId)
        .maybeSingle();
      if (!plan?.project_id) {
        return { project_title: null as string | null, project_code: plan?.project_code || null };
      }
      const { data: pj } = await client
        .from('projects')
        .select('project_title, project_id_prefix, project_id_number')
        .eq('id', plan.project_id)
        .maybeSingle();
      const derivedCode = pj?.project_id_prefix && pj?.project_id_number
        ? `${pj.project_id_prefix}-${pj.project_id_number}`
        : null;
      return {
        project_title: pj?.project_title || null,
        project_code: plan.project_code || derivedCode,
      };
    },
    staleTime: 60_000,
  });
}
