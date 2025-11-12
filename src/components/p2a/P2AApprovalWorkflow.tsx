import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Clock, XCircle, Send, MessageSquare } from 'lucide-react';
import { P2AHandover } from '@/hooks/useP2AHandovers';
import { useP2AApprovalWorkflow } from '@/hooks/useP2AApprovalWorkflow';
import { useP2ANotifications } from '@/hooks/useP2ANotifications';
import { Progress } from '@/components/ui/progress';

interface P2AApprovalWorkflowProps {
  handover: P2AHandover;
}

export const P2AApprovalWorkflow: React.FC<P2AApprovalWorkflowProps> = ({ handover }) => {
  const { approvals, isLoading, updateApproval } = useP2AApprovalWorkflow(handover.id);
  const { sendApprovalReadyNotification, sendApprovalCompletedNotification } = useP2ANotifications();
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [comments, setComments] = useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (stage: string) => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleApprove = (approval: any) => {
    setSelectedApproval(approval);
    setCommentModalOpen(true);
  };

  const handleSubmitApproval = async () => {
    if (selectedApproval) {
      updateApproval({ 
        id: selectedApproval.id, 
        status: 'APPROVED',
        comments 
      });

      // Check if this was the last approval stage
      const currentIndex = approvals?.findIndex(a => a.id === selectedApproval.id) || 0;
      const isLastStage = currentIndex === (approvals?.length || 0) - 1;

      if (isLastStage) {
        // Send completion notification to project team
        await sendApprovalCompletedNotification(
          handover.id,
          'project-team@example.com', // In production, fetch from project data
          'Project Team',
          {
            project_name: handover.project?.project_title || '',
            project_id: `${handover.project?.project_id_prefix}-${handover.project?.project_id_number}`,
            phase: handover.phase,
          }
        );
      } else {
        // Send notification to next approver
        const nextApproval = approvals?.[currentIndex + 1];
        if (nextApproval) {
          await sendApprovalReadyNotification(
            handover.id,
            'next-approver@example.com', // In production, fetch from user data
            nextApproval.approver_name,
            {
              project_name: handover.project?.project_title || '',
              project_id: `${handover.project?.project_id_prefix}-${handover.project?.project_id_number}`,
              phase: handover.phase,
              stage: getStatusLabel(nextApproval.stage),
            }
          );
        }
      }

      setCommentModalOpen(false);
      setComments('');
      setSelectedApproval(null);
    }
  };

  const completedCount = approvals?.filter(a => a.status === 'APPROVED').length || 0;
  const totalCount = approvals?.length || 4;
  const progress = (completedCount / totalCount) * 100;

  if (isLoading) {
    return <Card><CardContent className="p-8"><p>Loading approval workflow...</p></CardContent></Card>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Approval Workflow</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {approvals?.map((approval, index) => (
              <div key={approval.id} className="flex items-start gap-3 sm:gap-4 relative">
                {index < approvals.length - 1 && (
                  <div className="absolute left-[10px] top-8 w-0.5 h-12 sm:h-16 bg-border" />
                )}
                
                <div className="relative z-10 flex-shrink-0 mt-1">
                  {getStatusIcon(approval.status)}
                </div>
                
                <div className="flex-1 pt-0.5 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-sm sm:text-base">{getStatusLabel(approval.stage)}</h4>
                    <Badge variant={approval.status === 'APPROVED' ? 'default' : 'secondary'} className="w-fit text-xs">
                      {approval.status}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Approver: {approval.approver_name}</p>
                  {approval.approved_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Approved: {new Date(approval.approved_at).toLocaleDateString()}
                    </p>
                  )}
                  {approval.comments && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs">
                      <p className="font-semibold mb-1">Comments:</p>
                      <p className="break-words">{approval.comments}</p>
                    </div>
                  )}
                  {approval.status === 'PENDING' && index === completedCount && (
                    <Button size="sm" className="mt-3 text-xs" onClick={() => handleApprove(approval)}>
                      <Send className="mr-2 h-3 w-3" />
                      Submit Approval
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-muted rounded-lg space-y-3">
            <h4 className="font-semibold text-sm sm:text-base mb-2">Workflow Status</h4>
            <Progress value={progress} className="h-2" />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Progress: {completedCount} of {totalCount} stages completed ({Math.round(progress)}%)
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={commentModalOpen} onOpenChange={setCommentModalOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Add Approval Comments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                Add any comments or notes for this approval stage:
              </p>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Enter your comments..."
                rows={4}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2 sm:gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setCommentModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmitApproval}>
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};