import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Loader2, 
  ClipboardList, 
  AlertTriangle,
  Wrench,
  Rocket,
  Factory,
  FileText,
  type LucideIcon
} from 'lucide-react';
import { useActivePSSRReasonCategories } from '@/hooks/usePSSRReasonCategories';

// Export for backward compatibility with AddPSSRReasonWizard and EditPSSRReasonOverlay
export type SubCategoryType = 'P&E' | 'BFM' | null;

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

interface WizardStepCategoryProps {
  categoryId: string | null;
  onCategoryChange: (categoryId: string) => void;
  // Optional props for backward compatibility with AddPSSRReasonWizard
  subCategory?: SubCategoryType;
  onSubCategoryChange?: (subCategory: SubCategoryType) => void;
}

const WizardStepCategory: React.FC<WizardStepCategoryProps> = ({
  categoryId,
  onCategoryChange,
  subCategory,
  onSubCategoryChange,
}) => {
  const { data: categories, isLoading } = useActivePSSRReasonCategories();

  if (isLoading) {
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
          value={categoryId || ''}
          onValueChange={(value) => {
            onCategoryChange(value);
            // Reset sub-category when category changes (for backward compat)
            if (onSubCategoryChange) {
              const newCategory = categories?.find(c => c.id === value);
              if (newCategory?.code !== 'PROJECT_STARTUP') {
                onSubCategoryChange(null);
              }
            }
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
    </div>
  );
};

export default WizardStepCategory;
