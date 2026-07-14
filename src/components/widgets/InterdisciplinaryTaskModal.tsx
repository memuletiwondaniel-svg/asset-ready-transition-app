import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InterdisciplinarySummaryModal } from './InterdisciplinarySummaryModal';
import { ScheduleSofMeetingModal } from './ScheduleSofMeetingModal';
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
 * Task-click launcher: opens the Interdisciplinary Summary modal for a
 * `vcr_interdisciplinary_summary` task, and chains into the Schedule SoF
 * Meeting modal when the user confirms on a hydrocarbon VCR.
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

  const { expectedDisciplines, submitAssurance, isSubmitting } = useVCRDisciplineAssurance(
    open ? handoverPointId : undefined,
  );
  const { data: isHydrocarbon = false } = useVCRHydrocarbonStatus(open ? handoverPointId : undefined);

  const vcrLabel = `${vcrCode || 'VCR'}${vcrName ? ` (${vcrName})` : ''}`;

  const disciplineChips = useMemo(
    () =>
      (expectedDisciplines || []).map((d) => ({
        name: d.role_name,
        complete: d.submitted,
      })),
    [expectedDisciplines],
  );

  // Best-effort completion of the interdisciplinary task; the DB trigger also completes it.
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
        onScheduleSofMeeting={() => setSofOpen(true)}
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
    </>
  );
};
