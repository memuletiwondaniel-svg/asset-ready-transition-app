import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VCRExecutionPlanWizard } from '@/components/widgets/vcr-wizard/VCRExecutionPlanWizard';
import type { VCRReviewPayload } from '@/components/widgets/vcr-wizard/wizardModeContext';

interface Props {
  payload: VCRReviewPayload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Resolves the minimal ProjectVCR shape from a handover_point_id and opens
 * the VCRExecutionPlanWizard in read-only review mode. Shared across all
 * task views (Kanban, list, table) so the click → wizard route works
 * everywhere a VCR Plan Approval card surfaces.
 */
export const VCRPlanReviewLauncher: React.FC<Props> = ({ payload, open, onOpenChange }) => {
  const { data: vcr } = useQuery({
    queryKey: ['vcr-plan-review-launcher', payload?.handoverPointId],
    enabled: !!payload?.handoverPointId && open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_handover_points')
        .select('id, vcr_code, name, description, status, target_date, created_at, updated_at, execution_plan_status')
        .eq('id', payload!.handoverPointId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        vcr_code: data.vcr_code,
        name: data.name,
        description: data.description,
        status: data.status || 'IN_PROGRESS',
        target_date: data.target_date,
        created_at: data.created_at,
        updated_at: data.updated_at,
        progress: 0,
        systems_count: 0,
        has_hydrocarbon: false,
      };
    },
  });

  if (!payload || !vcr) return null;

  return (
    <VCRExecutionPlanWizard
      open={open}
      onOpenChange={onOpenChange}
      vcr={vcr}
      projectCode={payload.projectCode}
      reviewPayload={payload}
    />
  );
};
