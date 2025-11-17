import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalHistoryItem {
  id: string;
  approver_name: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at?: string;
  comments?: string;
  approval_order: number;
}

interface ChecklistApprovalHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistName: string;
  approvers: ApprovalHistoryItem[];
}

export const ChecklistApprovalHistory: React.FC<ChecklistApprovalHistoryProps> = ({
  open,
  onOpenChange,
  checklistName,
  approvers,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const sortedApprovers = [...approvers].sort((a, b) => a.approval_order - b.approval_order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Approval History</DialogTitle>
          <DialogDescription>{checklistName}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {sortedApprovers.map((approver, index) => (
              <div key={approver.id}>
                <Card className={cn(
                  "border-l-4",
                  approver.status === 'approved' && "border-l-green-500",
                  approver.status === 'rejected' && "border-l-red-500",
                  approver.status === 'pending' && "border-l-yellow-500"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(approver.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                Step {approver.approval_order}
                              </Badge>
                              {getStatusBadge(approver.status)}
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium">{approver.approver_name}</p>
                            </div>
                          </div>
                        </div>

                        {approver.approved_at && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {approver.status === 'approved' ? 'Approved' : 'Reviewed'} on{' '}
                              {new Date(approver.approved_at).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {approver.comments && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-md">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Comments
                                </p>
                                <p className="text-sm">{approver.comments}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {index < sortedApprovers.length - 1 && (
                  <div className="flex justify-center my-2">
                    <div className="h-8 w-px bg-border" />
                  </div>
                )}
              </div>
            ))}

            {sortedApprovers.length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No approval history available
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
