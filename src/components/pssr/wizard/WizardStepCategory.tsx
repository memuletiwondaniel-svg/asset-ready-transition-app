import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, AlertTriangle, Wrench, FileText, Loader2 } from 'lucide-react';
import { useActivePSSRReasonCategories } from '@/hooks/usePSSRReasonCategories';

export type SubCategoryType = 'P&E' | 'BFM' | null;

interface WizardStepCategoryProps {
  categoryId: string | null;
  subCategory: SubCategoryType;
  reasonName: string;
  description: string;
  onCategoryChange: (categoryId: string) => void;
  onSubCategoryChange: (subCategory: SubCategoryType) => void;
  onReasonNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  'Building2': <Building2 className="h-5 w-5" />,
  'AlertTriangle': <AlertTriangle className="h-5 w-5" />,
  'Wrench': <Wrench className="h-5 w-5" />,
  'FileText': <FileText className="h-5 w-5" />,
};

const WizardStepCategory: React.FC<WizardStepCategoryProps> = ({
  categoryId,
  subCategory,
  reasonName,
  description,
  onCategoryChange,
  onSubCategoryChange,
  onReasonNameChange,
  onDescriptionChange,
}) => {
  const { data: categories, isLoading } = useActivePSSRReasonCategories();
  
  const selectedCategory = categories?.find(c => c.id === categoryId);
  const isProjectCategory = selectedCategory?.code === 'PROJECT_STARTUP';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Category *</Label>
        <RadioGroup
          value={categoryId || ''}
          onValueChange={(value) => {
            onCategoryChange(value);
            // Reset sub-category when category changes
            const newCategory = categories?.find(c => c.id === value);
            if (newCategory?.code !== 'PROJECT_STARTUP') {
              onSubCategoryChange(null);
            }
          }}
          className="grid gap-3"
        >
          {categories?.map((category) => (
            <div key={category.id} className="relative">
              <RadioGroupItem
                value={category.id}
                id={category.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={category.id}
                className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              >
                <div className="p-2 rounded-full bg-muted">
                  {iconMap[category.icon || 'FileText'] || <FileText className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-muted-foreground">{category.description}</div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Sub-Category (only for Project Startup) */}
      {isProjectCategory && (
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
        <Label htmlFor="reason-name" className="text-base font-medium">PSSR Reason*</Label>
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
