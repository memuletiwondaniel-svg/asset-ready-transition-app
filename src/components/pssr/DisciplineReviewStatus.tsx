import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, RefreshCw, CheckCircle2, Clock, AlertCircle, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface DisciplineReviewStatusProps {
  pssrId: string;
}

interface DisciplineStatus {
  role: string;
  totalItems: number;
  readyItems: number;
  notifiedAt: string | null;
  status: 'not_sent' | 'sent' | 'in_progress' | 'completed';
  approverEmail?: string;
}

export const DisciplineReviewStatus: React.FC<DisciplineReviewStatusProps> = ({ pssrId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sendingRole, setSendingRole] = useState<string | null>(null);

  // Fetch discipline status from item approvals
  const { data: disciplineStatuses, isLoading } = useQuery({
    queryKey: ['pssr-discipline-status', pssrId],
    queryFn: async (): Promise<DisciplineStatus[]> => {
      // Get all item approvals grouped by role
      const { data: approvals, error } = await supabase
        .from('pssr_item_approvals')
        .select(`
          id,
          approver_role,
          status,
          notified_at,
          checklist_response_id
        `)
        .eq('pssr_id', pssrId);

      if (error) throw error;

      // Get checklist responses to check readiness (status = 'completed' means ready)
      const { data: responses } = await supabase
        .from('pssr_checklist_responses')
        .select('id, status')
        .eq('pssr_id', pssrId);

      const readyResponseIds = new Set(
        responses?.filter(r => r.status === 'completed').map(r => r.id) || []
      );

      // Group by role
      const roleMap = new Map<string, DisciplineStatus>();
      
      approvals?.forEach(approval => {
        const role = approval.approver_role;
        if (!roleMap.has(role)) {
          roleMap.set(role, {
            role,
            totalItems: 0,
            readyItems: 0,
            notifiedAt: null,
            status: 'not_sent'
          });
        }
        
        const status = roleMap.get(role)!;
        status.totalItems++;
        
        if (readyResponseIds.has(approval.checklist_response_id)) {
          status.readyItems++;
        }
        
        if (approval.notified_at && (!status.notifiedAt || approval.notified_at > status.notifiedAt)) {
          status.notifiedAt = approval.notified_at;
        }
        
        if (approval.status === 'approved' || approval.status === 'rejected' || approval.status === 'approved_with_action') {
          status.status = status.totalItems === status.readyItems ? 'completed' : 'in_progress';
        } else if (approval.notified_at) {
          status.status = 'sent';
        }
      });

      return Array.from(roleMap.values()).sort((a, b) => a.role.localeCompare(b.role));
    },
    enabled: !!pssrId
  });

  // Send notification mutation
  const sendNotification = useMutation({
    mutationFn: async (role: string) => {
      setSendingRole(role);
      
      const { data, error } = await supabase.functions.invoke('send-pssr-item-review-notification', {
        body: { pssrId, approverRole: role }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, role) => {
      toast({
        title: 'Notification sent',
        description: `Review request sent to ${role} approver.`
      });
      queryClient.invalidateQueries({ queryKey: ['pssr-discipline-status', pssrId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send notification',
        description: error.message,
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setSendingRole(null);
    }
  });

  const getStatusBadge = (status: DisciplineStatus) => {
    switch (status.status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case 'sent':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Send className="h-3 w-3 mr-1" />
            Sent {status.notifiedAt && formatDistanceToNow(new Date(status.notifiedAt), { addSuffix: true })}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <AlertCircle className="h-3 w-3 mr-1" />
            Not sent
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Users className="h-4 w-4 mr-2" />
            Discipline Review Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Users className="h-4 w-4 mr-2" />
          Discipline Review Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {disciplineStatuses?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No discipline reviews configured for this PSSR.
          </p>
        ) : (
          <div className="space-y-3">
            {disciplineStatuses?.map((discipline) => (
              <div
                key={discipline.role}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{discipline.role}</p>
                  <p className="text-xs text-muted-foreground">
                    {discipline.readyItems}/{discipline.totalItems} items ready
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusBadge(discipline)}
                  
                  {discipline.status === 'not_sent' && discipline.readyItems > 0 && (
                    <Button
                      size="sm"
                      onClick={() => sendNotification.mutate(discipline.role)}
                      disabled={sendingRole === discipline.role}
                    >
                      {sendingRole === discipline.role ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3 mr-1" />
                      )}
                      Send
                    </Button>
                  )}
                  
                  {discipline.status === 'sent' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendNotification.mutate(discipline.role)}
                      disabled={sendingRole === discipline.role}
                    >
                      {sendingRole === discipline.role ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      Resend
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
