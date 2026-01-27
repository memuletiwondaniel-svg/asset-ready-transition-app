import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, MoveRight, Link2Off, Box } from 'lucide-react';
import { P2APhase } from '../hooks/useP2APhases';

interface DeletePhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: P2APhase;
  vcrCount: number;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeletePhaseDialog: React.FC<DeletePhaseDialogProps> = ({
  open,
  onOpenChange,
  phase,
  vcrCount,
  onConfirm,
  isDeleting,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Delete Phase: {phase.name}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>You are about to delete this phase. This action cannot be undone.</p>
              
              {vcrCount > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-3 space-y-2">
                  <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                    <MoveRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      {vcrCount} VCR{vcrCount !== 1 ? 's' : ''} will be moved to Unassigned
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                    <Box className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      Systems will remain assigned to their VCRs
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                    <Link2Off className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      Phase milestone links will be removed
                    </span>
                  </div>
                </div>
              )}
              
              {vcrCount === 0 && (
                <p className="text-muted-foreground text-sm">
                  This phase has no VCRs and will be deleted immediately.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Phase'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
