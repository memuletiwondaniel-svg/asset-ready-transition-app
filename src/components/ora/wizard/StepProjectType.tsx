import React from 'react';
import { PROJECT_TYPES } from './types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Building2, Wrench, Cable } from 'lucide-react';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  TYPE_A: <Building2 className="w-5 h-5" />,
  TYPE_B: <Wrench className="w-5 h-5" />,
  TYPE_C: <Cable className="w-5 h-5" />,
};

const TYPE_COMPLEXITY: Record<string, { label: string; color: string }> = {
  TYPE_A: { label: 'High', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  TYPE_B: { label: 'Medium', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  TYPE_C: { label: 'Low', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
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
          Project complexity determines the scope of ORA activities recommended.
        </p>
      </div>

      <div className="grid gap-2.5">
        {PROJECT_TYPES.map(type => {
          const complexity = TYPE_COMPLEXITY[type.value];
          const isSelected = projectType === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onProjectTypeChange(type.value)}
              className={cn(
                "w-full text-left px-4 py-3.5 rounded-lg border transition-all",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
              )}
            >
              <div className="flex items-start gap-3.5">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground"
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
                  "w-4 h-4 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center",
                  isSelected ? "border-primary" : "border-muted-foreground/30"
                )}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
