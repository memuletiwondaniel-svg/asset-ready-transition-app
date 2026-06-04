import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type VCRLifecycle = 'not_started' | 'draft' | 'in_approval' | 'approved';

export interface ProjectVCR {
  id: string;
  vcr_code: string;
  name: string;
  description: string | null;
  status: string;
  target_date: string | null;
  created_at: string;
  updated_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  progress: number;
  closed_items: number;
  total_items: number;
  sof_signed: boolean;
  lifecycle: VCRLifecycle;
  systems_count: number;
  has_hydrocarbon: boolean;
}

export function useProjectVCRs(projectId: string) {
  return useQuery({
    queryKey: ['project-vcrs', projectId],
    queryFn: async (): Promise<ProjectVCR[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      const planResult = await client
        .from('p2a_handover_plans')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (planResult.error) throw planResult.error;
      if (!planResult.data) return [];

      const plan = planResult.data;

      const vcrsResult = await client
        .from('p2a_handover_points')
        .select('id, vcr_code, name, description, status, target_date, created_at, updated_at, execution_plan_status, execution_plan_submitted_at, execution_plan_approved_at')
        .eq('handover_plan_id', plan.id)
        .order('vcr_code', { ascending: true });

      if (vcrsResult.error) throw vcrsResult.error;
      if (!vcrsResult.data) return [];

      const vcrs = vcrsResult.data;

      const vcrsWithProgress = await Promise.all(
        vcrs.map(async (vcr: any) => {
          const prereqsResult = await client
            .from('p2a_vcr_prerequisites')
            .select('id, status')
            .eq('handover_point_id', vcr.id);

          const prereqs = prereqsResult.data || [];

          const systemsResult = await client
            .from('p2a_handover_point_systems')
            .select('id, system_id')
            .eq('handover_point_id', vcr.id);

          const systemMappings = systemsResult.data || [];
          const systemsCount = systemMappings.length;

          let hasHydrocarbon = false;
          if (systemMappings.length > 0) {
            const systemIds = systemMappings.map((m: any) => m.system_id);
            const hcResult = await client
              .from('p2a_systems')
              .select('id, is_hydrocarbon')
              .in('id', systemIds)
              .eq('is_hydrocarbon', true)
              .limit(1);
            hasHydrocarbon = (hcResult.data?.length || 0) > 0;
          }

          const total = prereqs.length;
          const closed = prereqs.filter(
            (p: any) => p.status === 'ACCEPTED' || p.status === 'READY_FOR_REVIEW'
          ).length;

          const status = (vcr.status || '').toString().toUpperCase();
          const execStatus = (vcr.execution_plan_status || '').toString().toUpperCase();
          const submittedAt: string | null = vcr.execution_plan_submitted_at ?? null;
          const approvedAt: string | null = vcr.execution_plan_approved_at ?? null;

          // SoF sign-off proxy (no dedicated VCR-level field yet — Phase C gap)
          const sofSigned = !!approvedAt && status === 'SIGNED';

          // Lifecycle derivation
          let lifecycle: VCRLifecycle;
          if (total === 0 && !submittedAt && !approvedAt) {
            lifecycle = 'not_started';
          } else if (sofSigned || status === 'SIGNED' || execStatus === 'APPROVED') {
            lifecycle = 'approved';
          } else if (submittedAt || execStatus === 'SUBMITTED' || execStatus === 'IN_APPROVAL' || execStatus === 'PENDING_APPROVAL') {
            lifecycle = 'in_approval';
          } else {
            lifecycle = 'draft';
          }

          // Weighted progress: checklist = 95%, SoF gate = 5%
          const checklistPct = total > 0 ? (closed / total) * 95 : 0;
          const progress = Math.round(checklistPct + (sofSigned ? 5 : 0));

          return {
            id: vcr.id,
            vcr_code: vcr.vcr_code,
            name: vcr.name,
            description: vcr.description,
            status: vcr.status,
            target_date: vcr.target_date,
            created_at: vcr.created_at,
            updated_at: vcr.updated_at ?? null,
            submitted_at: submittedAt,
            approved_at: approvedAt,
            progress,
            closed_items: closed,
            total_items: total,
            sof_signed: sofSigned,
            lifecycle,
            systems_count: systemsCount,
            has_hydrocarbon: hasHydrocarbon,
          } as ProjectVCR;
        })
      );

      return vcrsWithProgress;
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
