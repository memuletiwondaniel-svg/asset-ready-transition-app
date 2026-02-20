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
  PowerOff,
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
    return { icon: PowerOff, hue: 155 };
  }
  if (lower.includes('modification') || lower.includes('moc') || lower.includes('brown field')) {
    return { icon: Settings, hue: 270 };
  }
  if (lower.includes('project') || lower.includes('p&e')) {
    return { icon: Factory, hue: 220 };
  }
  return { icon: ClipboardList, hue: 180 };
};

// Display name overrides
const getDisplayName = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('restart') || (lower.includes('idle') && lower.includes('retired'))) {
    return 'Idle or Retired Equipment';
  }
  return name;
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
      
      {/* Card Grid - compact horizontal layout */}
      <div className="grid grid-cols-1 gap-2">
        {reasons?.map((reason) => {
          const config = getReasonCardConfig(reason.name);
          const IconComponent = config.icon;
          const isSelected = categoryId === reason.id;
          const displayName = getDisplayName(reason.name);
          
          return (
            <button
              key={reason.id}
              type="button"
              onClick={() => onCategoryChange(reason.id)}
              className={cn(
                'group relative flex items-center gap-3.5 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden',
                isSelected
                  ? 'border-primary shadow-md'
                  : 'border-border/50 hover:border-border hover:shadow-sm'
              )}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, hsl(${config.hue} 75% 96%), hsl(${config.hue} 65% 93%))`
                  : undefined,
              }}
            >
              {/* Hover gradient overlay - stronger */}
              <div 
                className={cn(
                  'absolute inset-0 opacity-0 transition-opacity duration-200 pointer-events-none',
                  !isSelected && 'group-hover:opacity-100'
                )}
                style={{
                  background: `linear-gradient(135deg, hsl(${config.hue} 60% 95% / 0.9), hsl(${config.hue} 50% 92% / 0.6))`,
                }}
              />

              {/* Icon */}
              <div 
                className="relative z-10 p-2 rounded-lg shrink-0 transition-colors duration-200"
                style={{
                  backgroundColor: isSelected 
                    ? `hsl(${config.hue} 65% 88%)` 
                    : `hsl(${config.hue} 40% 92%)`,
                }}
              >
                <IconComponent 
                  className="h-5 w-5 transition-colors duration-200"
                  strokeWidth={2.25}
                  style={{ 
                    color: isSelected 
                      ? `hsl(${config.hue} 80% 35%)` 
                      : `hsl(${config.hue} 50% 42%)` 
                  }}
                />
              </div>

              {/* Text content */}
              <div className="relative z-10 flex-1 min-w-0">
                <h4 className={cn(
                  'font-semibold text-sm leading-snug transition-colors',
                  isSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
                )}>
                  {displayName}
                </h4>
                {reason.description && (
                  <p className={cn(
                    'text-xs leading-snug mt-0.5 line-clamp-1 transition-colors',
                    isSelected ? 'text-muted-foreground' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
                  )}>
                    {reason.description}
                  </p>
                )}
              </div>

              {/* Check indicator */}
              {isSelected && (
                <CheckCircle2 
                  className="relative z-10 h-5 w-5 shrink-0 text-primary animate-in fade-in zoom-in duration-200" 
                />
              )}
            </button>
          );
        })}

        {/* Other card */}
        <button
          type="button"
          onClick={() => onCategoryChange(OTHER_ID)}
          className={cn(
            'group relative flex items-center gap-3.5 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden',
            isOtherSelected
              ? 'border-primary shadow-md'
              : 'border-border/50 hover:border-border hover:shadow-sm'
          )}
          style={{
            background: isOtherSelected
              ? `linear-gradient(135deg, hsl(0 0% 94%), hsl(0 0% 91%))`
              : undefined,
          }}
        >
          <div 
            className={cn(
              'absolute inset-0 opacity-0 transition-opacity duration-200 pointer-events-none',
              !isOtherSelected && 'group-hover:opacity-100'
            )}
            style={{
              background: `linear-gradient(135deg, hsl(0 0% 95% / 0.9), hsl(0 0% 93% / 0.6))`,
            }}
          />
          <div 
            className="relative z-10 p-2 rounded-lg shrink-0 transition-colors duration-200"
            style={{
              backgroundColor: isOtherSelected ? 'hsl(0 0% 86%)' : 'hsl(0 0% 92%)',
            }}
          >
            <HelpCircle 
              className="h-5 w-5 transition-colors duration-200"
              strokeWidth={2.25}
              style={{ color: isOtherSelected ? 'hsl(0 0% 30%)' : 'hsl(0 0% 45%)' }}
            />
          </div>
          <div className="relative z-10 flex-1 min-w-0">
            <h4 className={cn(
              'font-semibold text-sm leading-snug transition-colors',
              isOtherSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
            )}>
              Other
            </h4>
            <p className={cn(
              'text-xs leading-snug mt-0.5 transition-colors',
              isOtherSelected ? 'text-muted-foreground' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
            )}>
              Other reason not listed above
            </p>
          </div>
          {isOtherSelected && (
            <CheckCircle2 className="relative z-10 h-5 w-5 shrink-0 text-primary animate-in fade-in zoom-in duration-200" />
          )}
        </button>
      </div>
    </div>
  );
};

export default WizardStepCategory;
