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
import { AlertTriangle, Trash2 } from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';

interface DeleteVCRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcr: P2AHandoverPoint;
  systemsCount: number;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteVCRDialog: React.FC<DeleteVCRDialogProps> = ({
  open,
  onOpenChange,
  vcr,
  systemsCount,
  onConfirm,
  isDeleting,
}) => {
  // Extract short VCR code for display
  const vcrShortCode = vcr.vcr_code;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg">Delete VCR?</AlertDialogTitle>
              <p className="text-sm text-muted-foreground font-mono">{vcrShortCode}</p>
            </div>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm">
                You are about to permanently delete <strong>"{vcr.name}"</strong>. This action cannot be undone.
              </p>

              {/* Warning Box */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 font-medium text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Important Implications
                </div>
                <ul className="text-sm text-muted-foreground space-y-1.5 ml-6 list-disc">
                  {systemsCount > 0 && (
                    <li>
                      <strong>{systemsCount} system{systemsCount > 1 ? 's' : ''}</strong> currently assigned to this VCR will become <strong>unassigned</strong>
                    </li>
                  )}
                  <li>All prerequisites and checklist items will be deleted</li>
                  <li>All training mappings will be removed</li>
                  <li>All associated documents and evidence will be lost</li>
                  <li>Any VCR relationships (prerequisites/dependents) will be removed</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                Systems can only belong to one VCR at a time. After deletion, you'll need to reassign them to another VCR.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Delete VCR'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
