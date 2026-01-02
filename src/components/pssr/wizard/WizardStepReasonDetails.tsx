import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface WizardStepReasonDetailsProps {
  reasonName: string;
  description: string;
  onReasonNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
}

const WizardStepReasonDetails: React.FC<WizardStepReasonDetailsProps> = ({
  reasonName,
  description,
  onReasonNameChange,
  onDescriptionChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Reason Name */}
      <div className="space-y-3">
        <Label htmlFor="reason-name" className="text-base font-medium">PSSR Reason *</Label>
        <Input
          id="reason-name"
          value={reasonName}
          onChange={(e) => onReasonNameChange(e.target.value)}
          placeholder="Enter the name for this PSSR reason..."
          maxLength={100}
        />
        <p className="text-sm text-muted-foreground">
          {reasonName.length}/100 characters
        </p>
      </div>

      {/* Additional Description */}
      <div className="space-y-3">
        <Label htmlFor="description" className="text-base font-medium">Additional Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Provide additional context or details about this PSSR reason..."
          maxLength={500}
          rows={4}
        />
        <p className="text-sm text-muted-foreground">
          {description.length}/500 characters
        </p>
      </div>
    </div>
  );
};

export default WizardStepReasonDetails;
