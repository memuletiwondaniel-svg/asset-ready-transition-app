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
import { CheckCircle2, AlertTriangle, Clock, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ApprovalConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pssrTitle: string;
  approverRole: string;
  comments?: string;
  isLoading?: boolean;
  type?: 'approve' | 'reject';
}

export const ApprovalConfirmationDialog: React.FC<ApprovalConfirmationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  pssrTitle,
  approverRole,
  comments,
  isLoading = false,
  type = 'approve',
}) => {
  const isApprove = type === 'approve';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${
              isApprove ? 'bg-green-500/10' : 'bg-destructive/10'
            }`}>
              {isApprove ? (
                <Shield className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
            </div>
            <AlertDialogTitle>
              {isApprove ? 'Confirm PSSR Approval' : 'Confirm Request for Changes'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            {isApprove ? (
              <>
                You are about to approve this PSSR. This action:
                <ul className="list-disc pl-4 mt-2 space-y-1 text-muted-foreground">
                  <li>Will be recorded with your name and timestamp</li>
                  <li>Will notify the next approver in the queue</li>
                  <li>Cannot be easily undone</li>
                </ul>
              </>
            ) : (
              <>
                You are requesting changes to this PSSR. This will:
                <ul className="list-disc pl-4 mt-2 space-y-1 text-muted-foreground">
                  <li>Pause the approval workflow</li>
                  <li>Notify the PSSR owner of required changes</li>
                  <li>Record your feedback for review</li>
                </ul>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Summary Card */}
        <div className="my-4 p-4 bg-muted/50 rounded-lg border border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">PSSR</span>
            <span className="text-sm font-medium truncate max-w-[200px]">{pssrTitle}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Approving as</span>
            <Badge variant="secondary" className="text-xs">{approverRole}</Badge>
          </div>
          <div className="flex items-start justify-between">
            <span className="text-xs text-muted-foreground">Your comments</span>
            <span className="text-xs text-right max-w-[200px] italic text-muted-foreground">
              {comments || 'No comments provided'}
            </span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isApprove ? 'Confirm Approval' : 'Submit Feedback'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
