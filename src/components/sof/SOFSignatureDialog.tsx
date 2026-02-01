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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SignatureCanvas } from './SignatureCanvas';
import { AlertTriangle, CheckCircle2, MessageSquare, ShieldAlert, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SOFSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approverName: string;
  approverRole: string;
  savedSignature?: string | null;
  onSign: (signatureData: string, comments: string) => void;
  onReject?: (priorityLevel: 'Pr1' | 'Pr2', description: string, linkedItemId?: string) => void;
  onSaveSignature?: (signatureData: string) => void;
  isLoading?: boolean;
}

// Mock checklist items for linking
const mockChecklistItems = [
  { id: 'GN-01', title: 'Walkdown complete with no open Pr1 items' },
  { id: 'PS-03', title: 'Safety critical equipment tested and verified' },
  { id: 'ER-02', title: 'Emergency response procedures in place' },
  { id: 'IN-05', title: 'Instrumentation calibration certificates available' },
];

export const SOFSignatureDialog: React.FC<SOFSignatureDialogProps> = ({
  open,
  onOpenChange,
  approverName,
  approverRole,
  savedSignature,
  onSign,
  onReject,
  onSaveSignature,
  isLoading = false,
}) => {
  const [step, setStep] = useState<'confirm' | 'sign' | 'reject'>('confirm');
  const [reviewedComments, setReviewedComments] = useState(false);
  const [reviewedQualifications, setReviewedQualifications] = useState(false);
  const [comments, setComments] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  
  // Rejection state
  const [priorityLevel, setPriorityLevel] = useState<'Pr1' | 'Pr2'>('Pr1');
  const [rejectionDescription, setRejectionDescription] = useState('');
  const [linkToItem, setLinkToItem] = useState(false);
  const [linkedItemId, setLinkedItemId] = useState<string>('');

  const handleClose = () => {
    // Reset state on close
    setStep('confirm');
    setReviewedComments(false);
    setReviewedQualifications(false);
    setComments('');
    setSignatureData(null);
    setPriorityLevel('Pr1');
    setRejectionDescription('');
    setLinkToItem(false);
    setLinkedItemId('');
    onOpenChange(false);
  };

  const handleProceedToSign = () => {
    setStep('sign');
  };

  const handleProceedToReject = () => {
    setStep('reject');
  };

  const handleSubmitSignature = () => {
    if (signatureData) {
      onSign(signatureData, comments);
      handleClose();
    }
  };

  const handleSubmitRejection = () => {
    if (rejectionDescription.trim() && onReject) {
      onReject(priorityLevel, rejectionDescription, linkToItem ? linkedItemId : undefined);
      handleClose();
    }
  };

  const canProceedToSign = reviewedComments && reviewedQualifications;
  const canSubmit = !!signatureData;
  const canReject = rejectionDescription.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirmation Required
              </DialogTitle>
              <DialogDescription>
                Before signing the Statement of Fitness, please confirm you have reviewed the following:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Review Discipline Comments */}
              <div
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                  reviewedComments 
                    ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800" 
                    : "border-border bg-muted/30"
                )}
              >
                <Checkbox
                  id="comments"
                  checked={reviewedComments}
                  onCheckedChange={(checked) => setReviewedComments(!!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor="comments" className="font-medium cursor-pointer flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Discipline Comments
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    I have reviewed all discipline comments and feedback from the PSSR team.
                  </p>
                </div>
              </div>

              {/* Review Qualifications/Deviations */}
              <div
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                  reviewedQualifications 
                    ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800" 
                    : "border-border bg-muted/30"
                )}
              >
                <Checkbox
                  id="qualifications"
                  checked={reviewedQualifications}
                  onCheckedChange={(checked) => setReviewedQualifications(!!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor="qualifications" className="font-medium cursor-pointer flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    Qualifications
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    I have reviewed all approved qualifications against VCR and PSSR items that cannot be fully met.
                  </p>
                </div>
              </div>

              {/* Optional Comments */}
              <div className="space-y-2">
                <Label htmlFor="signatureComments" className="text-sm font-medium">
                  Comments (optional)
                </Label>
                <Textarea
                  id="signatureComments"
                  placeholder="Enter any comments you'd like to include with your signature..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleProceedToReject}
                className="sm:mr-auto"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button 
                onClick={handleProceedToSign} 
                disabled={!canProceedToSign}
              >
                Proceed to Sign
              </Button>
            </DialogFooter>
          </>
        ) : step === 'reject' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                Reject Statement of Fitness
              </DialogTitle>
              <DialogDescription>
                Specify the reason for rejection and create a follow-up action.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Priority Level Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Priority Level</Label>
                <RadioGroup
                  value={priorityLevel}
                  onValueChange={(value) => setPriorityLevel(value as 'Pr1' | 'Pr2')}
                  className="space-y-2"
                >
                  <div className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    priorityLevel === 'Pr1' 
                      ? "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800" 
                      : "border-border bg-muted/20 hover:bg-muted/40"
                  )}>
                    <RadioGroupItem value="Pr1" id="pr1" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="pr1" className="font-medium cursor-pointer flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Priority 1 (Pr1) - Must Complete Before Startup
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Blocks SoF approval. Action must be closed before you can re-review.
                      </p>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    priorityLevel === 'Pr2' 
                      ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800" 
                      : "border-border bg-muted/20 hover:bg-muted/40"
                  )}>
                    <RadioGroupItem value="Pr2" id="pr2" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="pr2" className="font-medium cursor-pointer flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Priority 2 (Pr2) - Comment / Follow-up After Startup
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Logged as comment and priority action. Does not block SoF approval.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
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

              {/* Rejection Description */}
              <div className="space-y-2">
                <Label htmlFor="rejectionDescription" className="text-sm font-medium">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rejectionDescription"
                  placeholder="Describe the issue that needs to be addressed..."
                  value={rejectionDescription}
                  onChange={(e) => setRejectionDescription(e.target.value)}
                  className="resize-none"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This will be sent to the PSSR Lead as a {priorityLevel} action.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('confirm')}>
                Back
              </Button>
              <Button 
                variant="destructive"
                onClick={handleSubmitRejection} 
                disabled={!canReject || isLoading}
              >
                {isLoading ? 'Submitting...' : `Submit ${priorityLevel} Rejection`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Sign Statement of Fitness
              </DialogTitle>
              <DialogDescription>
                Draw your signature below or use your saved signature.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium">{approverName}</p>
                <p className="text-xs text-muted-foreground">{approverRole}</p>
              </div>

              <SignatureCanvas
                onSignatureChange={setSignatureData}
                savedSignature={savedSignature}
                onSaveSignature={onSaveSignature}
                showSavedOption={!!savedSignature}
                width={400}
                height={150}
              />

              {comments && (
                <div className="mt-4 p-3 rounded-lg bg-muted/30 border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Your comments:</p>
                  <p className="text-sm">{comments}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('confirm')}>
                Back
              </Button>
              <Button 
                onClick={handleSubmitSignature} 
                disabled={!canSubmit || isLoading}
              >
                {isLoading ? 'Submitting...' : 'Submit Signature'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SOFSignatureDialog;
