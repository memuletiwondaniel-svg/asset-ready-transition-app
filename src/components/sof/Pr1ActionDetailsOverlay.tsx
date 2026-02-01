import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, User, Calendar, Link2, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface Pr1ActionDetailsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description?: string;
  linkedItem?: string;
  assignedTo?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  projectName?: string;
}

export const Pr1ActionDetailsOverlay: React.FC<Pr1ActionDetailsOverlayProps> = ({
  open,
  onOpenChange,
  description,
  linkedItem,
  assignedTo,
  rejectedAt,
  rejectedBy,
  projectName,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Pr1 Action Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Action Description */}
          <Card className="border-red-200 bg-red-50/30">
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Action Description</h4>
              <p className="text-sm text-foreground">
                {description || 'No description provided'}
              </p>
            </CardContent>
          </Card>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Linked Item */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />
                Linked Item
              </div>
              <p className="text-sm font-medium">
                {linkedItem || 'PSSR Walkdown Checklist Item #4.2'}
              </p>
            </div>

            {/* Assigned To */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Assigned To
              </div>
              <p className="text-sm font-medium">
                {assignedTo || 'PSSR Lead (John Smith)'}
              </p>
            </div>

            {/* Rejected By */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Rejected By
              </div>
              <p className="text-sm font-medium">
                {rejectedBy || 'Paul Van Den Hemel'}
              </p>
              <p className="text-xs text-muted-foreground">P&M Director</p>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Rejection Date
              </div>
              <p className="text-sm font-medium">
                {rejectedAt ? format(new Date(rejectedAt), 'dd MMM yyyy, HH:mm') : 'Just now'}
              </p>
            </div>
          </div>

          {/* Project Reference */}
          {projectName && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <FileText className="h-3.5 w-3.5" />
                Project
              </div>
              <p className="text-sm font-medium">{projectName}</p>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
              Pr1 - Must Close Before Startup
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
