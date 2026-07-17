import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProcedureDrawer } from '@/components/p2a-workspace/handover-points/procedures/ProcedureDrawer';
import { ProcedureOwnerCTA } from '@/components/p2a-workspace/handover-points/procedures/ProcedureOwnerCTA';

/**
 * Task launcher for procedure_action / procedure_review kanban tasks.
 * Opens the ProcedureDrawer and auto-opens the state-appropriate modal:
 *  - procedure_action → Start Draft / Submit for Review / Resubmit
 *  - procedure_review → Review Decision (for the caller's pending row)
 */
export interface ProcedureTaskLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedureId: string;
}

export const ProcedureTaskLauncher: React.FC<ProcedureTaskLauncherProps> = ({
  open, onOpenChange, procedureId,
}) => {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  return (
    <ProcedureDrawer
      procedureId={open ? procedureId : null}
      open={open}
      onOpenChange={onOpenChange}
      currentUserId={uid}
      footerSlot={({ data, currentUserId }) =>
        data ? (
          <ProcedureOwnerCTA data={data} currentUserId={currentUserId} autoOpen />
        ) : null
      }
    />
  );
};
