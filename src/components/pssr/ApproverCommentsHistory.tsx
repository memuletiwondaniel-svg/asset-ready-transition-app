import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock 
} from 'lucide-react';

interface ApproverCommentsHistoryProps {
  pssrId: string;
}

export const ApproverCommentsHistory: React.FC<ApproverCommentsHistoryProps> = ({ pssrId }) => {
  const { data: approvers, isLoading } = useQuery({
    queryKey: ['pssr-approvers-history', pssrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_approvers')
        .select('*')
        .eq('pssr_id', pssrId)
        .order('approver_level', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!pssrId,
  });

  const approversWithComments = approvers?.filter(a => 
    a.status !== 'PENDING' && (a.comments || a.approved_at)
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (approversWithComments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Approver Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-4">
            No approvers have provided comments yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Approver Comments & Decisions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4">
            {approversWithComments.map((approver) => (
              <div 
                key={approver.id}
                className="flex gap-3 p-3 rounded-lg border bg-card"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`text-sm ${
                    approver.status === 'APPROVED' 
                      ? 'bg-green-500/20 text-green-600'
                      : 'bg-destructive/20 text-destructive'
                  }`}>
                    {approver.status === 'APPROVED' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{approver.approver_name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {approver.approver_role}
                    </Badge>
                    <Badge 
                      className={`text-xs ${
                        approver.status === 'APPROVED'
                          ? 'bg-green-500/20 text-green-600 border-green-500/30'
                          : 'bg-destructive/20 text-destructive border-destructive/30'
                      }`}
                    >
                      {approver.status}
                    </Badge>
                  </div>
                  
                  {approver.comments && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{approver.comments}"
                    </p>
                  )}
                  
                  {approver.approved_at && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(approver.approved_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
