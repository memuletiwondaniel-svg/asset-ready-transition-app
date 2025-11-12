import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useORPPlans } from '@/hooks/useORPPlans';

interface ORPApprovalPanelProps {
  planId: string;
  approvals: any[];
}

export const ORPApprovalPanel: React.FC<ORPApprovalPanelProps> = ({ planId, approvals }) => {
  const { updateApproval } = useORPPlans();
  const [comments, setComments] = useState<Record<string, string>>({});

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const handleApprove = (approvalId: string) => {
    updateApproval({
      approvalId,
      status: 'APPROVED',
      comments: comments[approvalId]
    });
  };

  const handleReject = (approvalId: string) => {
    updateApproval({
      approvalId,
      status: 'REJECTED',
      comments: comments[approvalId]
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {approvals?.map((approval) => (
          <div key={approval.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{approval.approver_role}</h4>
                {approval.approver_user_id && (
                  <p className="text-sm text-muted-foreground">Approved by: User ID</p>
                )}
              </div>
              {getStatusBadge(approval.status)}
            </div>

            {approval.status === 'PENDING' && (
              <>
                <Textarea
                  placeholder="Add comments (optional)..."
                  value={comments[approval.id] || ''}
                  onChange={(e) => setComments({ ...comments, [approval.id]: e.target.value })}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(approval.id)}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(approval.id)}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </>
            )}

            {approval.status !== 'PENDING' && approval.comments && (
              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-medium mb-1">Comments:</p>
                <p>{approval.comments}</p>
                {approval.approved_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(approval.approved_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
