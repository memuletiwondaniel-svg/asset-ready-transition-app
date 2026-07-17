import React from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProcedureActions } from '../useProcedureActions';

interface Props {
  procedureId: string;
  procedureTitle: string;
  documentNumber?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Slim confirm dialog for the NOT_STARTED → DRAFT transition. Author only.
 */
export const StartDraftConfirmModal: React.FC<Props> = ({
  procedureId, procedureTitle, documentNumber, open, onOpenChange,
}) => {
  const mutation = useProcedureActions(procedureId);

  const submit = async () => {
    await mutation.mutateAsync({ action: 'start_draft', payload: {} });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm z-[1510]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[14px]">Start drafting procedure?</AlertDialogTitle>
          <AlertDialogDescription className="text-[12px]">
            {procedureTitle}
            {documentNumber ? <> · <span className="font-mono">{documentNumber}</span></> : null}
            <div className="mt-2 text-muted-foreground">
              This marks the procedure as in-progress and assigns you as the author.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Starting…' : 'Start draft'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
