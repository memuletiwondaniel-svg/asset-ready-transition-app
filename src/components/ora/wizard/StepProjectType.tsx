import React from 'react';
import { Label } from '@/components/ui/label';
import { PROJECT_TYPES } from './types';
import { cn } from '@/lib/utils';
import { Layers } from 'lucide-react';

interface Props {
  projectType: string;
  onProjectTypeChange: (type: string) => void;
}

export const StepProjectType: React.FC<Props> = ({ projectType, onProjectTypeChange }) => {
  return (
    <div className="space-y-6 p-1">
      <div className="text-center space-y-2 pb-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Layers className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Project Type / Complexity</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Select the project type to determine the scope and scale of ORA activities.
        </p>
      </div>

      <div className="space-y-3">
        {PROJECT_TYPES.map(type => (
          <div
            key={type.value}
            onClick={() => onProjectTypeChange(type.value)}
            className={cn(
              "p-4 rounded-lg border-2 cursor-pointer transition-all",
              projectType === type.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0",
                projectType === type.value ? "border-primary" : "border-muted-foreground/40"
              )}>
                {projectType === type.value && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{type.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{type.description}</p>
                <p className="text-xs text-muted-foreground/70 mt-1 italic">{type.reference}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
