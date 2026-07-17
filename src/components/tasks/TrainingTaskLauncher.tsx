import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrainingDrawer } from '@/components/p2a-workspace/handover-points/training/TrainingDrawer';
import { TrainingOwnerCTA } from '@/components/p2a-workspace/handover-points/training/TrainingOwnerCTA';

/**
 * FE-5: launcher that opens the Training drawer from a kanban task.
 *
 *  - training_action → opens the drawer for the training row and auto-opens
 *                      the state-appropriate owner modal (Request PO, Provide
 *                      PO, Upload materials, Provide attendance, Schedule,
 *                      Mark complete).
 *  - training_review → opens the drawer and auto-opens the Review Decision
 *                      modal for the current reviewer's pending row.
 */
export interface TrainingTaskLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainingId: string;
}

export const TrainingTaskLauncher: React.FC<TrainingTaskLauncherProps> = ({
  open, onOpenChange, trainingId,
}) => {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  return (
    <TrainingDrawer
      trainingId={open ? trainingId : null}
      open={open}
      onOpenChange={onOpenChange}
      currentUserId={uid}
      footerSlot={({ data, currentUserId }) =>
        data ? (
          <TrainingOwnerCTA data={data} currentUserId={currentUserId} autoOpen />
        ) : null
      }
    />
  );
};
