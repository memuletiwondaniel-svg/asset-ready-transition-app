import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QualificationDrawer } from '@/components/p2a-workspace/handover-points/vcr-standard/QualificationDrawer';
import type { VCRQualification } from '@/components/p2a-workspace/hooks/useVCRQualifications';
import { normalizeCategoryCode } from '@/components/p2a-workspace/handover-points/vcr-standard/standardStatus';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  qualificationId: string;
  taskId?: string;
  vcrCode?: string;
  vcrName?: string;
}

/**
 * Fetches the qualification (+ prereq context) and opens the QualificationDrawer.
 * Used when a `qualification_review` task is clicked in the kanban.
 */
export const QualificationReviewLauncher: React.FC<Props> = ({
  open, onOpenChange, qualificationId, taskId, vcrCode, vcrName,
}) => {
  const { data: qual } = useQuery({
    queryKey: ['qualification-launcher', qualificationId],
    enabled: open && !!qualificationId,
    queryFn: async (): Promise<VCRQualification | null> => {
      const c = supabase as any;
      const { data: q } = await c
        .from('p2a_vcr_qualifications')
        .select('*')
        .eq('id', qualificationId)
        .maybeSingle();
      if (!q) return null;

      const { data: pr } = await c
        .from('p2a_vcr_prerequisites')
        .select('id, summary, display_order, handover_point_id, vcr_items:vcr_item_id ( category:category_id ( code ) )')
        .eq('id', q.vcr_prerequisite_id)
        .maybeSingle();

      return {
        ...q,
        prerequisite: pr ? {
          id: pr.id,
          summary: pr.summary,
          handover_point_id: pr.handover_point_id,
          display_order: pr.display_order,
          category: pr.vcr_items?.category?.code ?? null,
        } : undefined,
      } as VCRQualification;
    },
  });

  return (
    <QualificationDrawer
      qual={qual || null}
      vcrCode={vcrCode}
      vcrName={vcrName}
      taskId={taskId}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
};
