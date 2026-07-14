import React, { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InterdisciplinarySummaryModal } from './InterdisciplinarySummaryModal';
import { ScheduleSofMeetingModal } from './ScheduleSofMeetingModal';
import { SchedulePacMeetingModal } from './SchedulePacMeetingModal';
import { useVCRDisciplineAssurance } from './hooks/useVCRDisciplineAssurance';
import { useVCRHydrocarbonStatus } from '@/hooks/useVCRHydrocarbonStatus';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handoverPointId: string;
  projectId?: string;
  vcrCode?: string;
  vcrName?: string;
  projectPrefix?: string;
  taskId?: string;
}

/**
 * Task-click launcher for `vcr_interdisciplinary_summary`. On confirm, chains
 * into either the SoF meeting scheduler (HC VCR) or the PAC meeting scheduler
 * (non-HC VCR) — mirroring the DB `trg_vcr_discipline_assurance_completion`
 * branching so client and server agree on the closure path.
 */
export const InterdisciplinaryTaskModal: React.FC<Props> = ({
  open,
  onOpenChange,
  handoverPointId,
  projectId,
  vcrCode,
  vcrName,
  projectPrefix,
  taskId,
}) => {
  const { toast } = useToast();
  const [sofOpen, setSofOpen] = useState(false);
  const [pacOpen, setPacOpen] = useState(false);

  const { expectedDisciplines, submitAssurance, isSubmitting } = useVCRDisciplineAssurance(
    open ? handoverPointId : undefined,
  );
  const { data: hcStatus } = useVCRHydrocarbonStatus(open ? handoverPointId : undefined);
  const isHydrocarbon = !!hcStatus?.hasHydrocarbon;

  const vcrLabel = `${vcrCode || 'VCR'}${vcrName ? ` (${vcrName})` : ''}`;

  const disciplineChips = useMemo(
    () =>
      (expectedDisciplines || []).map((d) => ({
        name: d.role_name,
        complete: d.submitted,
      })),
    [expectedDisciplines],
  );

  const completeTask = async () => {
    if (!taskId) return;
    await (supabase as any)
      .from('user_tasks')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', taskId);
  };

  return (
    <>
      <InterdisciplinarySummaryModal
        open={open}
        onOpenChange={onOpenChange}
        vcrLabel={vcrLabel}
        disciplineChips={disciplineChips}
        isHydrocarbon={isHydrocarbon}
        isSubmitting={isSubmitting}
        onConfirm={async (summary) => {
          try {
            await submitAssurance({
              handoverPointId,
              disciplineRoleName: 'Interdisciplinary',
              assuranceStatement: summary,
              statementType: 'interdisciplinary',
            });
            await completeTask();
            toast({ title: 'Submitted', description: 'Interdisciplinary summary recorded.' });
          } catch {
            toast({ title: 'Error', description: 'Failed to submit statement.', variant: 'destructive' });
          }
        }}
        onScheduleSofMeeting={isHydrocarbon ? () => setSofOpen(true) : undefined}
        onSchedulePacMeeting={!isHydrocarbon ? () => setPacOpen(true) : undefined}
      />
      <ScheduleSofMeetingModal
        open={sofOpen}
        onOpenChange={setSofOpen}
        handoverPointId={handoverPointId}
        projectId={projectId}
        vcrCode={vcrCode}
        vcrName={vcrName}
        projectPrefix={projectPrefix}
      />
      <SchedulePacMeetingModal
        open={pacOpen}
        onOpenChange={setPacOpen}
        handoverPointId={handoverPointId}
        projectId={projectId}
        vcrCode={vcrCode}
        vcrName={vcrName}
        projectPrefix={projectPrefix}
      />
    </>
  );
};
