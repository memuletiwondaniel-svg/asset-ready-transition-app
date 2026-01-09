import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  Shield,
  Users
} from 'lucide-react';
import { ApprovalConfirmationDialog } from './ApprovalConfirmationDialog';
import { PSSRApprover } from '@/hooks/usePSSRApprovers';

interface ApproverDecisionPanelProps {
  pssrId: string;
  pssrTitle: string;
  approverId: string | null;
  currentApprover: PSSRApprover | undefined;
  canSignOff: boolean;
  onApprovalComplete?: () => void;
}

export const ApproverDecisionPanel: React.FC<ApproverDecisionPanelProps> = ({
  pssrId,
  pssrTitle,
  approverId,
  currentApprover,
  canSignOff,
  onApprovalComplete,
}) => {
  const queryClient = useQueryClient();
  const [comments, setComments] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch SoF approvers (directors) for the confirmation dialog
  const { data: sofApprovers } = useQuery({
    queryKey: ['sof-approvers', pssrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sof_approvers')
        .select('approver_name, approver_role')
        .eq('pssr_id', pssrId)
        .order('approver_level', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!pssrId,
  });

  // Fetch current approvers count
  const { data: approversData } = useQuery({
    queryKey: ['pssr-approvers-count', pssrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_approvers')
        .select('id, status')
        .eq('pssr_id', pssrId);
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const approved = data?.filter(a => a.status === 'APPROVED').length || 0;
      const isLast = approved === total - 1 && currentApprover?.status === 'PENDING';
      
      return { total, approved, isLast };
    },
    enabled: !!pssrId,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!approverId) throw new Error('No approver ID');
      
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('pssr_approvers')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
          comments: comments || null,
          user_id: user.user?.id,
        })
        .eq('id', approverId);
      
      if (error) throw error;
      
      // If this is the last approver, trigger SoF creation
      if (approversData?.isLast) {
        // TODO: Trigger SoF notification to directors
        console.log('Last approver - trigger SoF to directors');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-approvers'] });
      toast({
        title: 'Approval Recorded',
        description: approversData?.isLast 
          ? 'Your approval has been recorded. SoF will now be issued to directors.'
          : 'Your approval has been recorded. The next approver will be notified.',
      });
      onApprovalComplete?.();
    },
    onError: (error) => {
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!approverId) throw new Error('No approver ID');
      if (!comments.trim()) throw new Error('Comments are required for rejection');
      
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('pssr_approvers')
        .update({
          status: 'REJECTED',
          approved_at: new Date().toISOString(),
          comments: comments,
          user_id: user.user?.id,
        })
        .eq('id', approverId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-approvers'] });
      toast({
        title: 'Changes Requested',
        description: 'Your feedback has been recorded and the PSSR owner will be notified.',
      });
      onApprovalComplete?.();
    },
    onError: (error) => {
      toast({
        title: 'Action Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const isApprover = !!currentApprover && currentApprover.status === 'PENDING';
  const canApprove = isApprover && canSignOff;

  // Already approved/rejected
  if (currentApprover && currentApprover.status !== 'PENDING') {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Decision Recorded</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            You have already {currentApprover.status.toLowerCase()} this PSSR.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium">{currentApprover.approver_role}</p>
            <p className="text-muted-foreground text-xs">
              {currentApprover.approved_at && new Date(currentApprover.approved_at).toLocaleString()}
            </p>
            {currentApprover.comments && (
              <p className="mt-2 text-muted-foreground italic">"{currentApprover.comments}"</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not the current approver
  if (!isApprover) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg text-muted-foreground">Approval Locked</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You are not the current approver for this PSSR, or it's not yet your turn in the approval sequence.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Decision</CardTitle>
          </div>
          <CardDescription>
            Review the PSSR and provide your approval decision
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Approver Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium">{currentApprover.approver_name}</p>
            <p className="text-xs text-muted-foreground">{currentApprover.approver_role}</p>
            <Badge variant="secondary" className="mt-2">
              Level {currentApprover.approver_level} of {approversData?.total || '?'}
            </Badge>
          </div>

          {/* Warning if Priority A open */}
          {!canSignOff && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-700">Cannot Approve</p>
                <p className="text-amber-600 text-xs">
                  There are open Priority A actions that must be closed before approval.
                </p>
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="text-sm font-medium mb-2 block">Comments (optional)</label>
            <Textarea
              placeholder="Add your comments or observations..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          <Separator />

          {/* Decision Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Request Changes
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={!canApprove}
              onClick={() => setShowApproveDialog(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve PSSR
            </Button>
          </div>

          {/* SoF Notice for last approver */}
          {approversData?.isLast && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-4">
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary">Final Approval</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    You are the last approver. Upon approval, a Statement of Fitness (SoF) will be issued to:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {sofApprovers?.map((a, i) => (
                      <li key={i} className="text-xs font-medium">
                        • {a.approver_name} ({a.approver_role})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Confirmation Dialog */}
      <ApprovalConfirmationDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        onConfirm={() => {
          setShowApproveDialog(false);
          approveMutation.mutate();
        }}
        pssrTitle={pssrTitle}
        approverRole={currentApprover?.approver_role || ''}
        comments={comments}
        isLoading={approveMutation.isPending}
        type="approve"
      />

      {/* Reject Confirmation Dialog */}
      <ApprovalConfirmationDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onConfirm={() => {
          if (!comments.trim()) {
            toast({
              title: 'Comments Required',
              description: 'Please provide comments explaining the required changes.',
              variant: 'destructive',
            });
            return;
          }
          setShowRejectDialog(false);
          rejectMutation.mutate();
        }}
        pssrTitle={pssrTitle}
        approverRole={currentApprover?.approver_role || ''}
        comments={comments}
        isLoading={rejectMutation.isPending}
        type="reject"
      />
    </>
  );
};
