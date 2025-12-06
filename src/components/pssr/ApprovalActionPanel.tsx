import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { ApprovalConfirmationDialog } from './ApprovalConfirmationDialog';

interface ApprovalActionPanelProps {
  pssrId: string;
  pssrTitle: string;
  approverId: string;
  approverRole: string;
  onApprove: (comments?: string) => Promise<void>;
  onReject: (comments: string) => Promise<void>;
  isLoading?: boolean;
  isLocked?: boolean;
  lockedReason?: string;
}

export const ApprovalActionPanel: React.FC<ApprovalActionPanelProps> = ({
  pssrId,
  pssrTitle,
  approverId,
  approverRole,
  onApprove,
  onReject,
  isLoading = false,
  isLocked = false,
  lockedReason,
}) => {
  const [comments, setComments] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleApprove = async () => {
    await onApprove(comments);
    setShowApproveDialog(false);
    setComments('');
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      return; // Comments required for rejection
    }
    await onReject(comments);
    setShowRejectDialog(false);
    setComments('');
  };

  if (isLocked) {
    return (
      <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="p-1.5 rounded-full bg-muted">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Approval Locked</p>
            <p className="text-xs">{lockedReason || 'Complete previous steps to unlock approval.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/10">
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Your Approval</p>
            <p className="text-xs text-muted-foreground">Review and provide your decision</p>
          </div>
        </div>

        <Textarea
          placeholder="Add optional comments or notes (visible to other approvers)..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="min-h-[80px] text-sm resize-none"
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowRejectDialog(true)}
            disabled={isLoading || !comments.trim()}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Request Changes
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => setShowApproveDialog(true)}
            disabled={isLoading}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve PSSR
          </Button>
        </div>

        {!comments.trim() && (
          <p className="text-[10px] text-muted-foreground text-center">
            Comments are optional for approval but required for requesting changes
          </p>
        )}
      </div>

      {/* Approval Confirmation Dialog */}
      <ApprovalConfirmationDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        onConfirm={handleApprove}
        pssrTitle={pssrTitle}
        approverRole={approverRole}
        comments={comments}
        isLoading={isLoading}
        type="approve"
      />

      {/* Rejection Confirmation Dialog */}
      <ApprovalConfirmationDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onConfirm={handleReject}
        pssrTitle={pssrTitle}
        approverRole={approverRole}
        comments={comments}
        isLoading={isLoading}
        type="reject"
      />
    </>
  );
};
