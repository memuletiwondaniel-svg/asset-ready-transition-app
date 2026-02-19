import React from 'react';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  ClipboardList, 
  AlertTriangle,
  Wrench,
  Rocket,
  Factory,
  FileText,
  CheckCircle2,
  type LucideIcon
} from 'lucide-react';
import { useActivePSSRReasonCategories } from '@/hooks/usePSSRReasonCategories';
import { cn } from '@/lib/utils';

// Export for backward compatibility with AddPSSRReasonWizard and EditPSSRReasonOverlay
export type SubCategoryType = 'P&E' | 'BFM' | null;

interface CategoryCardConfig {
  icon: LucideIcon;
  hue: number;
  label: string;
}

const categoryCardConfig: Record<string, CategoryCardConfig> = {
  'PROJECT_STARTUP': { 
    icon: Rocket, 
    hue: 220,
    label: 'Project',
  },
  'BFM_PROJECTS': { 
    icon: Factory, 
    hue: 155,
    label: 'BFM',
  },
  'INCIDENCE': { 
    icon: AlertTriangle, 
    hue: 38,
    label: 'Incident',
  },
  'OPS_MTCE': { 
    icon: Wrench, 
    hue: 200,
    label: 'Operations',
  },
  'OTHERS': { 
    icon: FileText, 
    hue: 270,
    label: 'Other',
  },
};

const getCardConfig = (code: string): CategoryCardConfig => {
  return categoryCardConfig[code] || { 
    icon: ClipboardList, 
    hue: 0,
    label: '',
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
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <Label className="text-base font-medium">PSSR Category *</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Select the category that best describes the reason for this PSSR
        </p>
      </div>
      
      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories?.map((category) => {
          const config = getCardConfig(category.code);
          const IconComponent = config.icon;
          const isSelected = categoryId === category.id;
          
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                onCategoryChange(category.id);
                if (onSubCategoryChange) {
                  const cat = categories?.find(c => c.id === category.id);
                  if (cat?.code !== 'PROJECT_STARTUP') {
                    onSubCategoryChange(null);
                  }
                }
              }}
              className={cn(
                'group relative flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all duration-300 overflow-hidden',
                isSelected
                  ? 'border-primary shadow-md'
                  : 'border-border/60 hover:border-border hover:shadow-sm'
              )}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, hsl(${config.hue} 70% 97%), hsl(${config.hue} 60% 94%))`
                  : undefined,
              }}
            >
              {/* Hover gradient overlay */}
              <div 
                className={cn(
                  'absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none',
                  !isSelected && 'group-hover:opacity-100'
                )}
                style={{
                  background: `linear-gradient(135deg, hsl(${config.hue} 50% 97% / 0.7), hsl(${config.hue} 40% 95% / 0.4))`,
                }}
              />

              {/* Content */}
              <div className="relative z-10 w-full">
                {/* Top row: Icon + Check */}
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className={cn(
                      'p-2.5 rounded-lg transition-colors duration-300',
                    )}
                    style={{
                      backgroundColor: isSelected 
                        ? `hsl(${config.hue} 60% 90%)` 
                        : `hsl(${config.hue} 30% 94%)`,
                    }}
                  >
                    <IconComponent 
                      className="h-5 w-5 transition-colors duration-300"
                      style={{ 
                        color: isSelected 
                          ? `hsl(${config.hue} 70% 40%)` 
                          : `hsl(${config.hue} 30% 55%)` 
                      }}
                    />
                  </div>
                  
                  {isSelected && (
                    <CheckCircle2 
                      className="h-5 w-5 text-primary animate-in fade-in zoom-in duration-200" 
                    />
                  )}
                </div>

                {/* Title */}
                <h4 className={cn(
                  'font-semibold text-sm leading-snug mb-1.5 transition-colors',
                  isSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
                )}>
                  {category.name}
                </h4>

                {/* Description */}
                {category.description && (
                  <p className={cn(
                    'text-xs leading-relaxed transition-colors',
                    isSelected ? 'text-muted-foreground' : 'text-muted-foreground/70 group-hover:text-muted-foreground'
                  )}>
                    {category.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WizardStepCategory;
