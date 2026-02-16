import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROJECT_PHASES } from './types';
import { Target } from 'lucide-react';

interface Props {
  phase: string;
  onPhaseChange: (phase: string) => void;
}

export const StepPhaseSelection: React.FC<Props> = ({ phase, onPhaseChange }) => {
  return (
    <div className="space-y-6 p-1">
      <div className="text-center space-y-2 pb-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Select Project Phase</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Choose the current phase of the project to load the relevant ORA activities and deliverables.
        </p>
      </div>

      <div className="max-w-sm mx-auto">
        <Label>Project Phase *</Label>
        <Select value={phase} onValueChange={onPhaseChange}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select a phase..." />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_PHASES.map(p => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
