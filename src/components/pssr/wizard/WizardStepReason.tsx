import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  ClipboardList, 
  ChevronRight,
  AlertTriangle,
  Wrench,
  Rocket,
  Factory,
  FileText,
  Target,
  type LucideIcon
} from 'lucide-react';
import { useActivePSSRReasonCategories, usePSSRReasonsByCategory } from '@/hooks/usePSSRReasonCategories';
import ATIScopeSelector from './ATIScopeSelector';

// Category-specific icon and color configuration
interface CategoryIconConfig {
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}

const categoryIconConfig: Record<string, CategoryIconConfig> = {
  'PROJECT_STARTUP': { 
    icon: Rocket, 
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20'
  },
  'BFM_PROJECTS': { 
    icon: Factory, 
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20'
  },
  'INCIDENCE': { 
    icon: AlertTriangle, 
    colorClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20'
  },
  'OPS_MTCE': { 
    icon: Wrench, 
    colorClass: 'text-sky-600 dark:text-sky-400',
    bgClass: 'bg-sky-50 dark:bg-sky-900/20'
  },
  'OTHERS': { 
    icon: FileText, 
    colorClass: 'text-slate-500 dark:text-slate-400',
    bgClass: 'bg-slate-50 dark:bg-slate-800/20'
  },
};

const getIconConfig = (code: string): CategoryIconConfig => {
  return categoryIconConfig[code] || { 
    icon: ClipboardList, 
    colorClass: 'text-muted-foreground',
    bgClass: '' 
  };
};

interface WizardStepReasonProps {
  categoryId: string;
  reasonId: string;
  additionalDetails: string;
  selectedAtiScopeIds: string[];
  onCategoryChange: (categoryId: string) => void;
  onReasonChange: (reasonId: string) => void;
  onAdditionalDetailsChange: (details: string) => void;
  onAtiScopeChange: (scopeIds: string[]) => void;
}

const WizardStepReason: React.FC<WizardStepReasonProps> = ({
  categoryId,
  reasonId,
  additionalDetails,
  selectedAtiScopeIds,
  onCategoryChange,
  onReasonChange,
  onAdditionalDetailsChange,
  onAtiScopeChange,
}) => {
  const { data: categories, isLoading: categoriesLoading } = useActivePSSRReasonCategories();
  const { data: reasons, isLoading: reasonsLoading } = usePSSRReasonsByCategory(categoryId || null);

  const selectedCategory = categories?.find(c => c.id === categoryId);
  const selectedReason = reasons?.find(r => r.id === reasonId);
  
  // Check if selected reason requires ATI scope selection
  const requiresAtiScopes = selectedReason?.requires_ati_scopes === true;

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
            onAtiScopeChange([]); // Reset ATI scopes when category changes
          }}
          className="grid gap-3"
        >
          {categories?.map((category) => {
            const config = getIconConfig(category.code);
            const IconComponent = config.icon;
            
            return (
              <div
                key={category.id}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  categoryId === category.id
                    ? `border-primary ${config.bgClass} shadow-sm`
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                }`}
              >
                <RadioGroupItem value={category.id} id={category.id} className="mt-0.5" />
                <Label htmlFor={category.id} className="cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{category.name}</span>
                    <IconComponent className={`h-5 w-5 ${config.colorClass}`} />
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.description}
                    </p>
                  )}
                </Label>
              </div>
            );
          })}
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
      )}

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
