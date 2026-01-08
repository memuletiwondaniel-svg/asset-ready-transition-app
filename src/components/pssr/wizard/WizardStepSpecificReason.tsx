import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, ChevronRight, Target } from 'lucide-react';
import { usePSSRReasonsByCategory, useActivePSSRReasonCategories } from '@/hooks/usePSSRReasonCategories';
import ATIScopeSelector from './ATIScopeSelector';

interface WizardStepSpecificReasonProps {
  categoryId: string;
  reasonId: string;
  selectedAtiScopeIds: string[];
  onReasonChange: (reasonId: string) => void;
  onAtiScopeChange: (scopeIds: string[]) => void;
}

const WizardStepSpecificReason: React.FC<WizardStepSpecificReasonProps> = ({
  categoryId,
  reasonId,
  selectedAtiScopeIds,
  onReasonChange,
  onAtiScopeChange,
}) => {
  const { data: categories } = useActivePSSRReasonCategories();
  const { data: reasons, isLoading: reasonsLoading } = usePSSRReasonsByCategory(categoryId || null);

  const selectedCategory = categories?.find(c => c.id === categoryId);
  const selectedReason = reasons?.find(r => r.id === reasonId);
  
  // Check if selected reason requires ATI scope selection
  const requiresAtiScopes = selectedReason?.requires_ati_scopes === true;

  if (reasonsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Category Context */}
      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
        <p className="text-sm text-muted-foreground">
          Selected Category: <span className="font-medium text-foreground">{selectedCategory?.name}</span>
        </p>
      </div>

      {/* Specific Reason Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" />
          <Label className="text-base font-medium">Specific Reason *</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Select the specific reason for this PSSR
        </p>
        
        {reasons && reasons.length > 0 ? (
          <RadioGroup
            value={reasonId}
            onValueChange={(value) => {
              onReasonChange(value);
              onAtiScopeChange([]); // Reset ATI scopes when reason changes
            }}
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{reason.name}</span>
                    {reason.requires_ati_scopes && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">
                        ATI
                      </span>
                    )}
                  </div>
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

      {/* ATI Scope Selection - Only shown when reason requires it */}
      {reasonId && requiresAtiScopes && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <Label className="text-base font-medium">ATI Scope Selection *</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Select one or more scopes that apply to this Advanced Tie-in. This will determine 
            which checklist items and approvers are required.
          </p>
          
          <ATIScopeSelector
            selectedScopeIds={selectedAtiScopeIds}
            onScopeChange={onAtiScopeChange}
          />
          
          {selectedAtiScopeIds.length === 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              ⚠️ Please select at least one ATI scope to continue
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WizardStepSpecificReason;
