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
import { SignatureCanvas } from './SignatureCanvas';
import { AlertTriangle, CheckCircle2, MessageSquare, ShieldAlert, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Pr2Action {
  priority: 'Pr2';
  description: string;
}

interface SOFSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approverName: string;
  approverRole: string;
  savedSignature?: string | null;
  onSign: (signatureData: string, comments: string, pr2Action?: Pr2Action) => void;
  onReject?: (priorityLevel: 'Pr1', description: string, linkedItemId?: string) => void;
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
  
  // Pr2 action state (optional follow-up with approval)
  const [addPr2Action, setAddPr2Action] = useState(false);
  const [pr2Description, setPr2Description] = useState('');
  
  // Rejection state (always Pr1)
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
    setAddPr2Action(false);
    setPr2Description('');
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
      // If Pr2 action is added, pass it along with the signature
      const fullComments = addPr2Action && pr2Description.trim()
        ? `${comments}${comments ? '\n\n' : ''}[Pr2 Action Required]: ${pr2Description}`
        : comments;
      onSign(signatureData, fullComments, addPr2Action ? { priority: 'Pr2', description: pr2Description } : undefined);
      handleClose();
    }
  };

  const handleSubmitRejection = () => {
    if (rejectionDescription.trim() && onReject) {
      // Rejection is always Pr1
      onReject('Pr1', rejectionDescription, linkToItem ? linkedItemId : undefined);
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
                This will create a Priority 1 action that must be resolved before you can re-review.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Pr1 Info Banner */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Priority 1 (Pr1) - Must Complete Before Startup</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This blocks SoF approval. The action must be closed before you can re-review.
                  </p>
                </div>
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
                  placeholder="Describe the issue that needs to be addressed before startup..."
                  value={rejectionDescription}
                  onChange={(e) => setRejectionDescription(e.target.value)}
                  className="resize-none"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This will be sent to the PSSR Lead as a Priority 1 action.
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
                {isLoading ? 'Submitting...' : 'Submit Pr1 Rejection'}
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

              {/* Optional Pr2 Action */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="addPr2Action"
                    checked={addPr2Action}
                    onCheckedChange={(checked) => {
                      setAddPr2Action(!!checked);
                      if (!checked) setPr2Description('');
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="addPr2Action" className="font-medium cursor-pointer flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Add Priority 2 Follow-up Action
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Log an action to be completed after startup. Does not block approval.
                    </p>
                  </div>
                </div>
                
                {addPr2Action && (
                  <div className="ml-6">
                    <Textarea
                      placeholder="Describe the follow-up action required..."
                      value={pr2Description}
                      onChange={(e) => setPr2Description(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>

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
