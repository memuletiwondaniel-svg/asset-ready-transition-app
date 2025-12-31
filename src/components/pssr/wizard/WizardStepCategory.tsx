import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, Shield, Wrench } from 'lucide-react';

export type CategoryType = 'Project' | 'Safety Incidence' | 'Ops & Mtce';
export type SubCategoryType = 'P&E' | 'BFM' | null;

interface WizardStepCategoryProps {
  category: CategoryType | null;
  subCategory: SubCategoryType;
  reasonName: string;
  description: string;
  onCategoryChange: (category: CategoryType) => void;
  onSubCategoryChange: (subCategory: SubCategoryType) => void;
  onReasonNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
}

const categoryOptions: { value: CategoryType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'Project', 
    label: 'Project', 
    icon: <Building2 className="h-5 w-5" />,
    description: 'Project-related PSSR reasons (P&E or BFM)'
  },
  { 
    value: 'Safety Incidence', 
    label: 'Safety Incidence', 
    icon: <Shield className="h-5 w-5" />,
    description: 'Safety incident related reviews'
  },
  { 
    value: 'Ops & Mtce', 
    label: 'Ops & Mtce', 
    icon: <Wrench className="h-5 w-5" />,
    description: 'Operations and maintenance reviews'
  },
];

const WizardStepCategory: React.FC<WizardStepCategoryProps> = ({
  category,
  subCategory,
  reasonName,
  description,
  onCategoryChange,
  onSubCategoryChange,
  onReasonNameChange,
  onDescriptionChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Category *</Label>
        <RadioGroup
          value={category || ''}
          onValueChange={(value) => {
            onCategoryChange(value as CategoryType);
            // Reset sub-category when category changes
            if (value !== 'Project') {
              onSubCategoryChange(null);
            }
          }}
          className="grid gap-3"
        >
          {categoryOptions.map((option) => (
            <div key={option.value} className="relative">
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className="peer sr-only"
              />
              <Label
                htmlFor={option.value}
                className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              >
                <div className="p-2 rounded-full bg-muted">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Sub-Category (only for Project) */}
      {category === 'Project' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <Label className="text-base font-medium">Project Type *</Label>
          <Select
            value={subCategory || ''}
            onValueChange={(value) => onSubCategoryChange(value as SubCategoryType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select project type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="P&E">
                <div className="flex flex-col">
                  <span>P&E (Projects & Engineering)</span>
                </div>
              </SelectItem>
              <SelectItem value="BFM">
                <div className="flex flex-col">
                  <span>BFM (Brownfield Modification)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Reason Name */}
      <div className="space-y-3">
        <Label htmlFor="reason-name" className="text-base font-medium">PSSR Reason Name *</Label>
        <Input
          id="reason-name"
          value={reasonName}
          onChange={(e) => onReasonNameChange(e.target.value)}
          placeholder="Enter the name for this PSSR reason..."
          maxLength={100}
          className="text-base"
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
          className="text-base resize-none"
        />
        <p className="text-sm text-muted-foreground">
          {description.length}/500 characters (optional)
        </p>
      </div>
    </div>
  );
};

export default WizardStepCategory;
