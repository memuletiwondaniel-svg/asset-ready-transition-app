import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, FileText, Paperclip, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ItemApprovalStatus } from '@/hooks/usePSSRItemApprovals';

interface ItemApprovalCardProps {
  item: {
    id: string;
    approvalId: string;
    itemId: string;
    category: string;
    categoryName: string;
    topic: string | null;
    description: string;
    response: string | null;
    narrative: string | null;
    status: ItemApprovalStatus;
    comments: string | null;
    reviewedAt: string | null;
    sequenceNumber: number;
  };
  index: number;
  onApprove: () => void;
  onReject: (comments: string) => void;
  onPriorityA: () => void;
  onPriorityB: () => void;
  isUpdating: boolean;
}

const ItemApprovalCard: React.FC<ItemApprovalCardProps> = ({
  item,
  index,
  onApprove,
  onReject,
  onPriorityA,
  onPriorityB,
  isUpdating,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState('');

  const getStatusBadge = () => {
    switch (item.status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'approved_with_action':
        return <Badge className="bg-amber-500">Approved with Action</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'ready_for_review':
        return <Badge variant="secondary">Ready for Review</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getResponseBadge = () => {
    switch (item.response?.toUpperCase()) {
      case 'YES':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">YES - Compliant</Badge>;
      case 'NO':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">NO - Non-Compliant</Badge>;
      case 'NA':
      case 'N/A':
        return <Badge variant="secondary">N/A - Not Applicable</Badge>;
      default:
        return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

  const handleReject = () => {
    if (!rejectComments.trim()) return;
    onReject(rejectComments);
    setRejectDialogOpen(false);
    setRejectComments('');
  };

  const isAlreadyReviewed = ['approved', 'approved_with_action', 'rejected'].includes(item.status);

  return (
    <>
      <Card className={`border ${isAlreadyReviewed ? 'border-l-4' : ''} ${
        item.status === 'approved' ? 'border-l-green-500' :
        item.status === 'approved_with_action' ? 'border-l-amber-500' :
        item.status === 'rejected' ? 'border-l-red-500' : ''
      }`}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardContent className="py-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {index}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {item.topic && (
                        <Badge variant="outline" className="text-xs">{item.topic}</Badge>
                      )}
                      {getStatusBadge()}
                    </div>
                    <p className="text-sm font-medium text-foreground line-clamp-2">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getResponseBadge()}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-4">
              <Separator className="mb-4" />
              
              {/* Submission Details */}
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Submission Details
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Response</p>
                    {getResponseBadge()}
                  </div>
                  
                  {item.narrative && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Narrative / Justification</p>
                      <p className="text-sm bg-background p-3 rounded border">{item.narrative}</p>
                    </div>
                  )}
                  
                  {/* Placeholder for evidence/attachments */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Evidence / Attachments</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Paperclip className="h-4 w-4" />
                      <span>No attachments</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Previous Review Comments */}
              {item.comments && (
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <MessageSquare className="h-4 w-4" />
                    Review Comments
                  </h4>
                  <p className="text-sm">{item.comments}</p>
                  {item.reviewedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Reviewed on {new Date(item.reviewedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {!isAlreadyReviewed && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground mr-2">Your Decision:</span>
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove();
                    }}
                    disabled={isUpdating}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRejectDialogOpen(true);
                    }}
                    disabled={isUpdating}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPriorityA();
                    }}
                    disabled={isUpdating}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Priority A
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPriorityB();
                    }}
                    disabled={isUpdating}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Priority B
                  </Button>
                </div>
              )}

              {isAlreadyReviewed && (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    This item has been reviewed
                    {item.reviewedAt && ` on ${new Date(item.reviewedAt).toLocaleDateString()}`}
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this checklist item. The responsible party will be notified.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reject-comments">Rejection Reason (Required)</Label>
              <Textarea
                id="reject-comments"
                placeholder="Enter the reason for rejection..."
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectComments.trim() || isUpdating}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ItemApprovalCard;
