import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SOFRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReject: (description: string, linkedItemId?: string) => void;
  isLoading?: boolean;
}

// Mock checklist items for linking
const mockChecklistItems = [
  { id: 'GN-01', title: 'Walkdown complete with no open Pr1 items' },
  { id: 'PS-03', title: 'Safety critical equipment tested and verified' },
  { id: 'ER-02', title: 'Emergency response procedures in place' },
  { id: 'IN-05', title: 'Instrumentation calibration certificates available' },
];

export const SOFRejectDialog: React.FC<SOFRejectDialogProps> = ({
  open,
  onOpenChange,
  onReject,
  isLoading = false,
}) => {
  const [rejectionDescription, setRejectionDescription] = useState('');
  const [linkToItem, setLinkToItem] = useState(false);
  const [linkedItemId, setLinkedItemId] = useState<string>('');

  const handleClose = () => {
    setRejectionDescription('');
    setLinkToItem(false);
    setLinkedItemId('');
    onOpenChange(false);
  };

  const handleSubmitRejection = () => {
    if (rejectionDescription.trim()) {
      onReject(rejectionDescription, linkToItem ? linkedItemId : undefined);
      handleClose();
    }
  };

  const canReject = rejectionDescription.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Reject SoF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Pr1 Info Banner */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Priority 1 (Pr1) - Must Complete Before Startup</p>
              <p className="text-xs text-muted-foreground mt-1">
                The action must be closed before you can re-review.
              </p>
            </div>
          </div>

          {/* Rejection Description */}
          <div className="space-y-2">
            <Label htmlFor="rejectionDescription" className="text-sm font-medium">
              Closure Action Required <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejectionDescription"
              placeholder="Describe the issue and specific action required to close it..."
              value={rejectionDescription}
              onChange={(e) => setRejectionDescription(e.target.value)}
              className="resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This will be sent to the PSSR Lead as a Priority 1 action.
            </p>
          </div>

          {/* Link to Checklist Item Option */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="linkItem"
                checked={linkToItem}
                onCheckedChange={(checked) => {
                  setLinkToItem(!!checked);
                  if (!checked) setLinkedItemId('');
                }}
              />
              <Label htmlFor="linkItem" className="text-sm cursor-pointer">
                Link to a specific VCR/PSSR checklist item
              </Label>
            </div>
            
            {linkToItem && (
              <div className="ml-6 space-y-2">
                <Label className="text-xs text-muted-foreground">Select checklist item:</Label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {mockChecklistItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setLinkedItemId(item.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border text-sm cursor-pointer transition-colors",
                        linkedItemId === item.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                      <span className="text-xs truncate">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleSubmitRejection} 
            disabled={!canReject || isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit Pr1 Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SOFRejectDialog;
