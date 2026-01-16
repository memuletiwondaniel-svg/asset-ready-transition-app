import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Calendar } from 'lucide-react';
import { DeviationData } from '@/hooks/useP2AHandoverPrerequisites';

interface DeviationQualificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prerequisiteSummary: string;
  existingData?: DeviationData;
  onSubmit: (data: DeviationData) => void;
}

export const DeviationQualificationModal: React.FC<DeviationQualificationModalProps> = ({
  open,
  onOpenChange,
  prerequisiteSummary,
  existingData,
  onSubmit,
}) => {
  const [deviationReason, setDeviationReason] = useState(existingData?.deviation_reason || '');
  const [mitigation, setMitigation] = useState(existingData?.mitigation || '');
  const [followUpAction, setFollowUpAction] = useState(existingData?.follow_up_action || '');
  const [targetDate, setTargetDate] = useState(existingData?.target_date || '');

  const handleSubmit = () => {
    if (!deviationReason.trim() || !mitigation.trim()) return;
    
    onSubmit({
      deviation_reason: deviationReason.trim(),
      mitigation: mitigation.trim(),
      follow_up_action: followUpAction.trim() || undefined,
      target_date: targetDate || undefined,
    });
    onOpenChange(false);
  };

  const isValid = deviationReason.trim() && mitigation.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle>Request Deviation/Qualification</DialogTitle>
              <DialogDescription>
                Document why this prerequisite cannot be completed
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prerequisite Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <p className="text-sm font-medium">Prerequisite:</p>
              <p className="text-sm text-muted-foreground mt-1">{prerequisiteSummary}</p>
            </CardContent>
          </Card>

          {/* Deviation Reason */}
          <div className="space-y-2">
            <Label htmlFor="deviation-reason" className="font-medium">
              Why can't this be completed? *
            </Label>
            <Textarea
              id="deviation-reason"
              value={deviationReason}
              onChange={(e) => setDeviationReason(e.target.value)}
              placeholder="Explain the reason why this prerequisite cannot be completed..."
              className="min-h-[80px]"
            />
          </div>

          {/* Mitigation/Justification */}
          <div className="space-y-2">
            <Label htmlFor="mitigation" className="font-medium">
              Mitigation / Justification *
            </Label>
            <Textarea
              id="mitigation"
              value={mitigation}
              onChange={(e) => setMitigation(e.target.value)}
              placeholder="Describe the mitigation measures or justification for proceeding..."
              className="min-h-[80px]"
            />
          </div>

          {/* Follow-up Action Plan */}
          <div className="space-y-2">
            <Label htmlFor="follow-up" className="font-medium">
              Follow-up Action Plan
            </Label>
            <Textarea
              id="follow-up"
              value={followUpAction}
              onChange={(e) => setFollowUpAction(e.target.value)}
              placeholder="Optional: Describe any follow-up actions planned to address this..."
              className="min-h-[60px]"
            />
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label htmlFor="target-date" className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Target Completion Date
            </Label>
            <Input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Submit Deviation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
