import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ClipboardList, ChevronRight } from 'lucide-react';
import { useActivePSSRReasonCategories, usePSSRReasonsByCategory } from '@/hooks/usePSSRReasonCategories';

interface WizardStepReasonProps {
  categoryId: string;
  reasonId: string;
  additionalDetails: string;
  onCategoryChange: (categoryId: string) => void;
  onReasonChange: (reasonId: string) => void;
  onAdditionalDetailsChange: (details: string) => void;
}

const WizardStepReason: React.FC<WizardStepReasonProps> = ({
  categoryId,
  reasonId,
  additionalDetails,
  onCategoryChange,
  onReasonChange,
  onAdditionalDetailsChange,
}) => {
  const { data: categories, isLoading: categoriesLoading } = useActivePSSRReasonCategories();
  const { data: reasons, isLoading: reasonsLoading } = usePSSRReasonsByCategory(categoryId || null);

  const selectedCategory = categories?.find(c => c.id === categoryId);

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <Label className="text-base font-medium">PSSR Category *</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Select the category that best describes the reason for this PSSR
        </p>
        
        <RadioGroup
          value={categoryId}
          onValueChange={(value) => {
            onCategoryChange(value);
            onReasonChange(''); // Reset reason when category changes
          }}
          className="grid gap-3"
        >
          {categories?.map((category) => (
            <div
              key={category.id}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                categoryId === category.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
              }`}
            >
              <RadioGroupItem value={category.id} id={category.id} className="mt-0.5" />
              <Label htmlFor={category.id} className="cursor-pointer flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{category.name}</span>
                  {category.icon && (
                    <span className="text-lg">{category.icon}</span>
                  )}
                </div>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {category.description}
                  </p>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Specific Reason Selection */}
      {categoryId && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-primary" />
            <Label className="text-base font-medium">Specific Reason *</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Select the specific reason within "{selectedCategory?.name}"
          </p>
          
          {reasonsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reasons && reasons.length > 0 ? (
            <RadioGroup
              value={reasonId}
              onValueChange={onReasonChange}
              className="space-y-2"
            >
              {reasons.map((reason) => (
                <div
                  key={reason.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    reasonId === reason.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/20'
                  }`}
                >
                  <RadioGroupItem value={reason.id} id={`reason-${reason.id}`} />
                  <Label htmlFor={`reason-${reason.id}`} className="cursor-pointer flex-1">
                    <span className="font-medium">{reason.name}</span>
                    {reason.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reason.description}
                      </p>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center bg-muted/20 rounded-lg">
              No specific reasons configured for this category
            </div>
          )}
        </div>
      )}

      {/* Additional Details */}
      {categoryId && (
        <div className="space-y-3 pt-4 border-t">
          <Label htmlFor="additionalDetails" className="text-base font-medium">
            Additional Details (Optional)
          </Label>
          <Textarea
            id="additionalDetails"
            value={additionalDetails}
            onChange={(e) => onAdditionalDetailsChange(e.target.value)}
            placeholder="Provide any additional context or details for this PSSR..."
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {additionalDetails.length}/500 characters
          </p>
        </div>
      )}
    </div>
  );
};

export default WizardStepReason;
