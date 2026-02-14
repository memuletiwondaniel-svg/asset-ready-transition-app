import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PSSR_REASON_OPTIONS = [
  'Start-up after a Process Safety Incidence or Near Miss (RAM 5A/B and RED)',
  'Start-up after a Turn Around Maintenance (TAR)',
  'Startup of a retired or idle equipment (over 6 months)',
  'Start-up after a plant modification (Asset MoC)',
  'Other',
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
  const isOther = !PSSR_REASON_OPTIONS.slice(0, -1).includes(reasonName) && reasonName !== '';
  const [selectValue, setSelectValue] = useState(isOther ? 'Other' : reasonName);
  const [customReason, setCustomReason] = useState(isOther ? reasonName : '');

  const handleSelectChange = (value: string) => {
    setSelectValue(value);
    if (value === 'Other') {
      onReasonNameChange(customReason);
    } else {
      setCustomReason('');
      onReasonNameChange(value);
    }
  };

  const handleCustomReasonChange = (value: string) => {
    setCustomReason(value);
    onReasonNameChange(value);
  };

  return (
    <div className="space-y-6">
      {/* Reason Dropdown */}
      <div className="space-y-3">
        <Label htmlFor="reason-name" className="text-base font-medium">PSSR Reason *</Label>
        <Select value={selectValue} onValueChange={handleSelectChange}>
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
        {selectValue === 'Other' && (
          <div className="space-y-2 mt-3">
            <Label htmlFor="custom-reason" className="text-sm font-medium">Specify PSSR Reason *</Label>
            <Input
              id="custom-reason"
              value={customReason}
              onChange={(e) => handleCustomReasonChange(e.target.value)}
              placeholder="Enter custom PSSR reason..."
              maxLength={200}
            />
          </div>
        )}
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
