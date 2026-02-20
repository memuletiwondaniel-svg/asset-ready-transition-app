import React from 'react';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  ClipboardList, 
  AlertTriangle,
  Wrench,
  Factory,
  FileText,
  CheckCircle2,
  FlaskConical,
  Power,
  Settings,
  HelpCircle,
  type LucideIcon
} from 'lucide-react';
import { usePSSRReasons } from '@/hooks/usePSSRReasons';
import { cn } from '@/lib/utils';

// Export for backward compatibility with AddPSSRReasonWizard and EditPSSRReasonOverlay
export type SubCategoryType = 'P&E' | 'BFM' | null;

interface ReasonCardConfig {
  icon: LucideIcon;
  hue: number;
}

// Map reason names to icons/hues based on known templates
const getReasonCardConfig = (name: string): ReasonCardConfig => {
  const lower = name.toLowerCase();
  if (lower.includes('safety') || lower.includes('inciden')) {
    return { icon: AlertTriangle, hue: 38 };
  }
  if (lower.includes('turn around') || lower.includes('tar') || lower.includes('maintenance')) {
    return { icon: Wrench, hue: 200 };
  }
  if (lower.includes('restart') || lower.includes('idle') || lower.includes('retired')) {
    return { icon: Power, hue: 155 };
  }
  if (lower.includes('modification') || lower.includes('moc') || lower.includes('brown field')) {
    return { icon: Settings, hue: 270 };
  }
  if (lower.includes('project') || lower.includes('p&e')) {
    return { icon: Factory, hue: 220 };
  }
  return { icon: ClipboardList, hue: 180 };
};

interface WizardStepCategoryProps {
  categoryId: string | null;
  onCategoryChange: (categoryId: string) => void;
  // Optional props for backward compatibility
  subCategory?: SubCategoryType;
  onSubCategoryChange?: (subCategory: SubCategoryType) => void;
}

const WizardStepCategory: React.FC<WizardStepCategoryProps> = ({
  categoryId,
  onCategoryChange,
}) => {
  const { data: reasons, isLoading } = usePSSRReasons();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // "Other" as a virtual option
  const OTHER_ID = '__other__';
  const isOtherSelected = categoryId === OTHER_ID;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <Label className="text-base font-medium">PSSR Reason *</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Select the reason that best describes the purpose of this PSSR
        </p>
      </div>
      
      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {reasons?.map((reason) => {
          const config = getReasonCardConfig(reason.name);
          const IconComponent = config.icon;
          const isSelected = categoryId === reason.id;
          
          return (
            <button
              key={reason.id}
              type="button"
              onClick={() => onCategoryChange(reason.id)}
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
                    className="p-2.5 rounded-lg transition-colors duration-300"
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
                  {reason.name}
                </h4>

                {/* Description */}
                {reason.description && (
                  <p className={cn(
                    'text-xs leading-relaxed transition-colors',
                    isSelected ? 'text-muted-foreground' : 'text-muted-foreground/70 group-hover:text-muted-foreground'
                  )}>
                    {reason.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}

        {/* Other card */}
        <button
          type="button"
          onClick={() => onCategoryChange(OTHER_ID)}
          className={cn(
            'group relative flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all duration-300 overflow-hidden',
            isOtherSelected
              ? 'border-primary shadow-md'
              : 'border-border/60 hover:border-border hover:shadow-sm'
          )}
          style={{
            background: isOtherSelected
              ? `linear-gradient(135deg, hsl(0 0% 95%), hsl(0 0% 92%))`
              : undefined,
          }}
        >
          <div 
            className={cn(
              'absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none',
              !isOtherSelected && 'group-hover:opacity-100'
            )}
            style={{
              background: `linear-gradient(135deg, hsl(0 0% 97% / 0.7), hsl(0 0% 95% / 0.4))`,
            }}
          />
          <div className="relative z-10 w-full">
            <div className="flex items-center justify-between mb-3">
              <div 
                className="p-2.5 rounded-lg transition-colors duration-300"
                style={{
                  backgroundColor: isOtherSelected ? 'hsl(0 0% 88%)' : 'hsl(0 0% 94%)',
                }}
              >
                <HelpCircle 
                  className="h-5 w-5 transition-colors duration-300"
                  style={{ color: isOtherSelected ? 'hsl(0 0% 35%)' : 'hsl(0 0% 55%)' }}
                />
              </div>
              {isOtherSelected && (
                <CheckCircle2 className="h-5 w-5 text-primary animate-in fade-in zoom-in duration-200" />
              )}
            </div>
            <h4 className={cn(
              'font-semibold text-sm leading-snug mb-1.5 transition-colors',
              isOtherSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
            )}>
              Other
            </h4>
            <p className={cn(
              'text-xs leading-relaxed transition-colors',
              isOtherSelected ? 'text-muted-foreground' : 'text-muted-foreground/70 group-hover:text-muted-foreground'
            )}>
              Other reason not listed above
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default WizardStepCategory;
