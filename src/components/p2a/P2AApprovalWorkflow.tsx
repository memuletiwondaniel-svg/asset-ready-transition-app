import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Clock, XCircle, Send, MessageSquare } from 'lucide-react';
import { P2AHandover } from '@/hooks/useP2AHandovers';
import { useP2AApprovalWorkflow } from '@/hooks/useP2AApprovalWorkflow';
import { Progress } from '@/components/ui/progress';

interface P2AApprovalWorkflowProps {
  handover: P2AHandover;
}

export const P2AApprovalWorkflow: React.FC<P2AApprovalWorkflowProps> = ({ handover }) => {
  const { approvals, isLoading, updateApproval } = useP2AApprovalWorkflow(handover.id);
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

  const handleSubmitApproval = () => {
    if (selectedApproval) {
      updateApproval({ 
        id: selectedApproval.id, 
        status: 'APPROVED',
        comments 
      });
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
          <CardTitle>Approval Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {approvals?.map((approval, index) => (
              <div key={approval.id} className="flex items-start gap-4 relative">
                {index < approvals.length - 1 && (
                  <div className="absolute left-[10px] top-8 w-0.5 h-16 bg-border" />
                )}
                
                <div className="relative z-10 flex-shrink-0">
                  {getStatusIcon(approval.status)}
                </div>
                
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{getStatusLabel(approval.stage)}</h4>
                    <Badge variant={approval.status === 'APPROVED' ? 'default' : 'secondary'}>
                      {approval.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Approver: {approval.approver_name}</p>
                  {approval.approved_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Approved on: {new Date(approval.approved_at).toLocaleDateString()}
                    </p>
                  )}
                  {approval.comments && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs">
                      <p className="font-semibold mb-1">Comments:</p>
                      <p>{approval.comments}</p>
                    </div>
                  )}
                  {approval.status === 'PENDING' && index === completedCount && (
                    <Button size="sm" className="mt-3" onClick={() => handleApprove(approval)}>
                      <Send className="mr-2 h-3 w-3" />
                      Submit for Approval
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-muted rounded-lg space-y-3">
            <h4 className="font-semibold mb-2">Workflow Status</h4>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Progress: {completedCount} of {totalCount} stages completed ({Math.round(progress)}%)
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={commentModalOpen} onOpenChange={setCommentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Approval Comments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Add any comments or notes for this approval stage:
              </p>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Enter your comments..."
                rows={4}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setCommentModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitApproval}>
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};