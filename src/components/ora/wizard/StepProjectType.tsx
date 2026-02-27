import React from 'react';
import { PROJECT_TYPES } from './types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Factory, Settings, Zap } from 'lucide-react';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  TYPE_A: <Factory className="w-5 h-5" />,
  TYPE_B: <Settings className="w-5 h-5" />,
  TYPE_C: <Zap className="w-5 h-5" />,
};

const TYPE_COMPLEXITY: Record<string, { label: string; color: string; hoverBg: string; hoverBorder: string; hoverIcon: string }> = {
  TYPE_A: {
    label: 'High',
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    hoverBg: 'hover:bg-red-50 dark:hover:bg-red-950/30',
    hoverBorder: 'hover:border-red-300 dark:hover:border-red-700',
    hoverIcon: 'group-hover/type:bg-red-100 group-hover/type:text-red-600 dark:group-hover/type:bg-red-900/50 dark:group-hover/type:text-red-400',
  },
  TYPE_B: {
    label: 'Medium',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    hoverBg: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
    hoverIcon: 'group-hover/type:bg-amber-100 group-hover/type:text-amber-600 dark:group-hover/type:bg-amber-900/50 dark:group-hover/type:text-amber-400',
  },
  TYPE_C: {
    label: 'Low',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    hoverIcon: 'group-hover/type:bg-emerald-100 group-hover/type:text-emerald-600 dark:group-hover/type:bg-emerald-900/50 dark:group-hover/type:text-emerald-400',
  },
};

const SELECTED_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  TYPE_A: { bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-400 dark:border-red-600 ring-1 ring-red-200 dark:ring-red-800', icon: 'bg-red-500 text-white' },
  TYPE_B: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-400 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-800', icon: 'bg-amber-500 text-white' },
  TYPE_C: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-200 dark:ring-emerald-800', icon: 'bg-emerald-500 text-white' },
};

interface Props {
  projectType: string;
  onProjectTypeChange: (type: string) => void;
}

export const StepProjectType: React.FC<Props> = ({ projectType, onProjectTypeChange }) => {
  return (
    <div className="space-y-5 p-1">
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold">What type of project is this?</h3>
        <p className="text-xs text-muted-foreground">
          Project complexity determines the recommended duration for ORA activities.
        </p>
      </div>

      <div className="grid gap-2.5">
        {PROJECT_TYPES.map(type => {
          const complexity = TYPE_COMPLEXITY[type.value];
          const selected = SELECTED_STYLES[type.value];
          const isSelected = projectType === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onProjectTypeChange(type.value)}
              className={cn(
                "group/type w-full text-left px-4 py-3.5 rounded-lg border transition-all duration-200",
                isSelected
                  ? cn(selected.bg, selected.border)
                  : cn("border-border", complexity.hoverBg, complexity.hoverBorder)
              )}
            >
              <div className="flex items-start gap-3.5">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200",
                  isSelected
                    ? selected.icon
                    : cn("bg-muted/60 text-muted-foreground", complexity.hoverIcon)
                )}>
                  {TYPE_ICONS[type.value]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{type.label}</span>
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border", complexity.color)}>
                      {complexity.label} complexity
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {type.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5 font-mono">
                    {type.reference}
                  </p>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center transition-colors",
                  isSelected
                    ? cn("border-current", type.value === 'TYPE_A' ? 'border-red-500' : type.value === 'TYPE_B' ? 'border-amber-500' : 'border-emerald-500')
                    : "border-muted-foreground/30"
                )}>
                  {isSelected && <div className={cn(
                    "w-2 h-2 rounded-full",
                    type.value === 'TYPE_A' ? 'bg-red-500' : type.value === 'TYPE_B' ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
