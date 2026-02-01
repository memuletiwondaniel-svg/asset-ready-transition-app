import React from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, FileWarning, Clock, Paperclip, User, Calendar, Hash, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface QualificationDetail {
  id: string;
  qualificationId: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  approvedBy: string;
  approverRole: string;
  secondApprover?: string;
  secondApproverRole?: string;
  approvedAt: string;
  mitigationMeasures: string;
  expiryDate: string;
  punchlistRef?: string;
  riskDescription: string;
  riskRating: string;
  actionOwner: string;
  actionOwnerRole: string;
  attachments: { name: string; type: string }[];
  poNumber?: string;
  poDeliveryDate?: string;
}

interface SOFQualificationDetailDialogProps {
  qualification: QualificationDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SOFQualificationDetailDialog: React.FC<SOFQualificationDetailDialogProps> = ({
  qualification,
  open,
  onOpenChange,
}) => {
  if (!qualification) return null;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
            <FileWarning className="h-3 w-3 mr-1" />
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Low
          </Badge>
        );
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getRiskRatingBadge = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'high':
        return <Badge variant="destructive">{rating}</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500 hover:bg-amber-600">{rating}</Badge>;
      case 'low':
        return <Badge className="bg-green-500 hover:bg-green-600">{rating}</Badge>;
      default:
        return <Badge variant="outline">{rating}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{qualification.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-normal">
                  {qualification.category}
                </Badge>
                {getSeverityBadge(qualification.severity)}
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approved
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Qualification ID & Punchlist Reference */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              <span className="font-medium">ID:</span>
              <span className="text-foreground font-mono">{qualification.qualificationId}</span>
            </div>
            {qualification.punchlistRef && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-medium">Punchlist:</span>
                <span className="text-foreground font-mono">{qualification.punchlistRef}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1.5">Description</p>
            <p className="text-sm">{qualification.description}</p>
          </div>

          {/* Risk Assessment */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Risk Assessment</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Risk Rating</p>
                {getRiskRatingBadge(qualification.riskRating)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Risk Description</p>
                <p className="text-sm">{qualification.riskDescription}</p>
              </div>
            </div>
          </div>

          {/* Mitigation Measures */}
          <div className={cn(
            "p-4 rounded-lg border bg-muted/30",
            qualification.severity === 'medium' && "border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/20"
          )}>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Mitigation Measures
            </p>
            <p className="text-sm">{qualification.mitigationMeasures}</p>
            {qualification.poNumber && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Bill of Materials (BOM) and min-max has been approved. Purchase Order <span className="font-mono text-foreground">{qualification.poNumber}</span> has been issued with delivery date of <span className="text-foreground">{qualification.poDeliveryDate}</span>.
                </p>
              </div>
            )}
          </div>

          {/* Action Owner */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Action Owner</p>
              <p className="text-sm font-medium">{qualification.actionOwner}</p>
              <p className="text-xs text-muted-foreground">{qualification.actionOwnerRole}</p>
            </div>
          </div>

          {/* Attachments */}
          {qualification.attachments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Attachments</p>
              </div>
              <div className="space-y-1.5">
                {qualification.attachments.map((attachment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm p-2 rounded border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{attachment.name}</span>
                    <Badge variant="outline" className="text-xs">{attachment.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Approval Details */}
          <div className={qualification.secondApprover ? "grid grid-cols-2 gap-4 text-sm" : "grid grid-cols-3 gap-4 text-sm"}>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Approved by</p>
              <p className="font-medium">{qualification.approvedBy}</p>
              <p className="text-xs text-muted-foreground">{qualification.approverRole}</p>
              {qualification.secondApprover && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="font-medium">{qualification.secondApprover}</p>
                  <p className="text-xs text-muted-foreground">{qualification.secondApproverRole}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Approved on</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{formatDate(qualification.approvedAt)}</span>
              </div>
            </div>
            {!qualification.secondApprover && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Valid until</p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatDate(qualification.expiryDate)}</span>
                </div>
              </div>
            )}
          </div>
          {qualification.secondApprover && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-1">Valid until</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{formatDate(qualification.expiryDate)}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SOFQualificationDetailDialog;
