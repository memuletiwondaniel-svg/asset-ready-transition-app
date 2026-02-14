import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PSSR_REASON_OPTIONS = [
  'Start-up after a Process Safety Incidence or Near Miss (RAM 5A/B and RED)',
  'Start-up after an Emergency Shutdown',
  'Start-up after a Turnaround or Extended Shutdown',
  'Start-up of New or Modified Facilities',
  'Start-up after Maintenance on Critical Equipment',
  'Start-up after a Management of Change (MOC)',
  'Periodic PSSR Review',
];

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
      {/* Reason Dropdown */}
      <div className="space-y-3">
        <Label htmlFor="reason-name" className="text-base font-medium">PSSR Reason *</Label>
        <Select value={reasonName} onValueChange={onReasonNameChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a PSSR reason..." />
          </SelectTrigger>
          <SelectContent>
            {PSSR_REASON_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
