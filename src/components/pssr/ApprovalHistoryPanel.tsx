import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { PSSRApprover } from '@/hooks/usePSSRApprovers';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface ApprovalHistoryPanelProps {
  approvers: PSSRApprover[];
  title?: string;
}

export const ApprovalHistoryPanel: React.FC<ApprovalHistoryPanelProps> = ({
  approvers,
  title = 'Approval History',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const completedApprovers = approvers.filter(a => a.status !== 'PENDING');
  const pendingApprovers = approvers.filter(a => a.status === 'PENDING');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive" className="text-[10px]">Changes Requested</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (approvers.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="outline" className="text-[10px]">
            {completedApprovers.length}/{approvers.length} complete
          </Badge>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-2">
        {/* Completed Approvals */}
        {completedApprovers.map((approver) => (
          <div
            key={approver.id}
            className="p-3 rounded-lg border border-border/50 bg-card/50 space-y-2"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-muted">
                  {getInitials(approver.approver_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{approver.approver_name}</span>
                  {getStatusBadge(approver.status)}
                </div>
                <span className="text-xs text-muted-foreground">{approver.approver_role}</span>
              </div>
              <div className="text-right">
                {getStatusIcon(approver.status)}
                {approver.approved_at && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(approver.approved_at), 'MMM d, h:mm a')}
                  </p>
                )}
              </div>
            </div>

            {/* Comments */}
            {approver.comments && (
              <div className="pl-11">
                <div className="p-2 rounded bg-muted/50 border-l-2 border-primary/30">
                  <p className="text-xs text-muted-foreground italic">
                    "{approver.comments}"
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Pending Approvals */}
        {pendingApprovers.map((approver) => (
          <div
            key={approver.id}
            className="p-3 rounded-lg border border-border/30 bg-muted/20 opacity-60"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-muted/50">
                  {getInitials(approver.approver_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{approver.approver_name}</span>
                  {getStatusBadge(approver.status)}
                </div>
                <span className="text-xs text-muted-foreground">{approver.approver_role}</span>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
