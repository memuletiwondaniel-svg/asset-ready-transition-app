import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText,
  X,
  ExternalLink,
  User,
  Calendar,
  Paperclip,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  FileWarning
} from 'lucide-react';
import { CategoryItem } from '@/hooks/usePSSRCategoryProgress';
import { format } from 'date-fns';

interface PSSRItemDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CategoryItem | null;
  pssrId: string;
}

const getStatusBadge = (item: CategoryItem) => {
  if (item.approval_status === 'approved') {
    return (
      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  
  if (item.approval_status === 'approved_with_action') {
    return (
      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 gap-1">
        <AlertTriangle className="h-3 w-3" />
        Approved with Action
      </Badge>
    );
  }
  
  if (item.approval_status === 'rejected') {
    return (
      <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
        <X className="h-3 w-3" />
        Rejected
      </Badge>
    );
  }

  if (item.response === 'YES') {
    return (
      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
        Yes
      </Badge>
    );
  }
  
  if (item.response === 'NO' || item.response === 'DEVIATION') {
    return (
      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
        Deviation
      </Badge>
    );
  }
  
  if (item.response === 'NA') {
    return <Badge variant="secondary">N/A</Badge>;
  }
  
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
};

const getStatusIcon = (item: CategoryItem) => {
  if (item.approval_status === 'approved' || item.response === 'YES' || item.response === 'NA') {
    return <CheckCircle2 className="h-6 w-6 text-green-500" />;
  }
  if (item.response === 'NO' || item.response === 'DEVIATION' || item.approval_status === 'approved_with_action') {
    return <AlertTriangle className="h-6 w-6 text-amber-500" />;
  }
  if (item.approval_status === 'rejected') {
    return <X className="h-6 w-6 text-destructive" />;
  }
  return <Clock className="h-6 w-6 text-muted-foreground" />;
};

export const PSSRItemDetailModal: React.FC<PSSRItemDetailModalProps> = ({
  open,
  onOpenChange,
  item,
  pssrId,
}) => {
  if (!item) return null;

  const isDeviation = item.response === 'NO' || item.response === 'DEVIATION';
  const hasAttachments = item.attachments && item.attachments.length > 0;
  const hasApproval = item.approval_status !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {getStatusIcon(item)}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                  {item.unique_id}
                </code>
                {getStatusBadge(item)}
              </div>
              <DialogTitle className="text-lg leading-relaxed">
                {item.question}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Category: {item.category}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Response Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <FileText className="h-4 w-4" />
                  Response
                </div>
                <p className="font-medium text-lg">
                  {item.response || 'Not Answered'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Submitted
                </div>
                <p className="font-medium">
                  {item.submitted_at 
                    ? format(new Date(item.submitted_at), 'MMM d, yyyy')
                    : 'Not submitted'}
                </p>
              </div>
            </div>

            {/* Narrative / Justification */}
            {(item.narrative || item.justification) && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <MessageSquare className="h-4 w-4" />
                  Narrative / Justification
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border text-sm">
                  {item.narrative || item.justification}
                </div>
              </div>
            )}

            {/* Deviation Details */}
            {isDeviation && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-amber-600 font-medium mb-3">
                    <FileWarning className="h-4 w-4" />
                    Deviation Details
                  </div>
                  
                  <div className="space-y-4">
                    {item.deviation_reason && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Reason for Deviation</p>
                        <p className="text-sm">{item.deviation_reason}</p>
                      </div>
                    )}
                    
                    {item.potential_risk && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Potential Risk</p>
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-sm">{item.potential_risk}</p>
                        </div>
                      </div>
                    )}
                    
                    {item.mitigations && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Mitigations</p>
                        <p className="text-sm">{item.mitigations}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Follow-up Action */}
            {item.follow_up_action && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Follow-up Action Required
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm mb-2">{item.follow_up_action}</p>
                    {item.action_owner && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <User className="h-4 w-4" />
                        <span>Owner: {item.action_owner}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Evidence & Attachments */}
            <Separator />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Paperclip className="h-4 w-4" />
                Evidence & Attachments
              </div>
              
              {hasAttachments ? (
                <div className="flex flex-wrap gap-2">
                  {item.attachments!.map((url, idx) => {
                    const fileName = url.split('/').pop() || `Attachment ${idx + 1}`;
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                    
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2"
                        onClick={() => window.open(url, '_blank')}
                      >
                        {isImage ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                        <span className="max-w-[150px] truncate">
                          {fileName.length > 20 ? `${fileName.substring(0, 20)}...` : fileName}
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 rounded-lg border border-dashed">
                  <Paperclip className="h-4 w-4" />
                  <span>No attachments uploaded</span>
                </div>
              )}
            </div>

            {/* Technical Authority Review */}
            {hasApproval && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <ShieldCheck className="h-4 w-4" />
                    Technical Authority Review
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        {getStatusBadge(item)}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Review Date</p>
                        <p className="text-sm">
                          {item.approved_at 
                            ? format(new Date(item.approved_at), 'MMM d, yyyy')
                            : 'Pending review'}
                        </p>
                      </div>
                    </div>
                    
                    {item.approver_name && (
                      <div className="flex items-center gap-2 text-sm mb-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Reviewed by: {item.approver_name}</span>
                      </div>
                    )}
                    
                    {item.approval_comments && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Comments</p>
                        <p className="text-sm italic">"{item.approval_comments}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PSSRItemDetailModal;
