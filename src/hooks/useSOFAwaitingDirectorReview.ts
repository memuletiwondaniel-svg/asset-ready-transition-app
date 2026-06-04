import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface SOFPendingReview {
  id: string;
  source: 'PSSR' | 'VCR';
  pssr_id?: string;
  sof_certificate_id?: string;
  vcr_id?: string;
  project_id?: string;
  vcr_label?: string;
  approver_role: string;
  approver_name: string;
  status: string;
  created_at: string;
  pssr: {
    id: string;
    pssr_id: string;
    project_name: string;
    asset: string | null;
    scope: string | null;
    created_at: string;
  } | null;
}

/**
 * Fetch SoF items awaiting director review.
 * Returns both PSSR-sourced and VCR-sourced approvals for the current user.
 */
export const useSOFAwaitingDirectorReview = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sof-awaiting-director-review', user?.id],
    queryFn: async (): Promise<SOFPendingReview[]> => {
      if (!user?.id) return [];
      const client = supabase as any;

      // ---- PSSR-sourced (existing path) ----
      const { data: sofApprovals, error } = await client
        .from('sof_approvers')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['PENDING', 'LOCKED']);
      if (error) throw error;

      const pssrIds = [...new Set((sofApprovals || []).map((a: any) => a.pssr_id).filter(Boolean))];
      let pssrMap = new Map<string, any>();
      if (pssrIds.length) {
        const { data: pssrs } = await client
          .from('pssrs')
          .select('id, pssr_id, project_name, asset, scope, created_at')
          .in('id', pssrIds);
        pssrMap = new Map((pssrs || []).map((p: any) => [p.id, p]));
      }

      const pssrResults: SOFPendingReview[] = (sofApprovals || []).map((a: any) => ({
        id: a.id,
        source: 'PSSR',
        pssr_id: a.pssr_id,
        sof_certificate_id: a.sof_certificate_id,
        approver_role: a.approver_role,
        approver_name: a.approver_name,
        status: a.status,
        created_at: a.created_at,
        pssr: pssrMap.get(a.pssr_id) || null,
      }));

      // ---- VCR-sourced ----
      const { data: vcrApprovals } = await client
        .from('vcr_sof_approvers')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['PENDING', 'LOCKED']);

      let vcrResults: SOFPendingReview[] = [];
      if (vcrApprovals?.length) {
        const hpIds = [...new Set(vcrApprovals.map((a: any) => a.handover_point_id))];
        const { data: hps } = await client
          .from('p2a_handover_points')
          .select('id, vcr_code, name, handover_plan_id')
          .in('id', hpIds);
        const planIds = [...new Set((hps || []).map((h: any) => h.handover_plan_id))];
        const { data: plans } = await client
          .from('p2a_handover_plans')
          .select('id, project_id, project_code')
          .in('id', planIds);
        const planMap = new Map<string, any>((plans || []).map((p: any) => [p.id, p]));
        const hpMap = new Map<string, any>((hps || []).map((h: any) => [h.id, h]));

        vcrResults = vcrApprovals.map((a: any) => {
          const hp: any = hpMap.get(a.handover_point_id);
          const plan: any = hp ? planMap.get(hp.handover_plan_id) : null;
          const label = hp ? `${hp.vcr_code} ${hp.name}` : 'VCR';
          return {
            id: a.id,
            source: 'VCR',
            vcr_id: a.handover_point_id,
            project_id: plan?.project_id,
            vcr_label: label,
            approver_role: a.approver_role,
            approver_name: a.approver_name,
            status: a.status,
            created_at: a.created_at,
            pssr: hp
              ? {
                  id: a.handover_point_id,
                  pssr_id: hp.vcr_code,
                  project_name: `${plan?.project_code || ''} ${hp.name}`.trim(),
                  asset: hp.name,
                  scope: null,
                  created_at: a.created_at,
                }
              : null,
          };
        });

      }

      return [...pssrResults, ...vcrResults];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};
