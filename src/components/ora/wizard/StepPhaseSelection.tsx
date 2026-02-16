import React from 'react';
import { PROJECT_PHASES } from './types';
import { cn } from '@/lib/utils';
import { Search, FileCheck, ListFilter, PenLine, Rocket } from 'lucide-react';

const PHASE_ICONS: Record<string, React.ReactNode> = {
  IDENTIFY: <Search className="w-5 h-5" />,
  ASSESS: <FileCheck className="w-5 h-5" />,
  SELECT: <ListFilter className="w-5 h-5" />,
  DEFINE: <PenLine className="w-5 h-5" />,
  EXECUTE: <Rocket className="w-5 h-5" />,
};

const PHASE_DESCRIPTIONS: Record<string, string> = {
  IDENTIFY: 'Identify hazards, risks & opportunities early in the project lifecycle',
  ASSESS: 'Assess risk levels and evaluate mitigation options',
  SELECT: 'Select preferred alternatives and risk treatment strategies',
  DEFINE: 'Define detailed scope, plans and deliverables',
  EXECUTE: 'Execute the plan and manage operational readiness activities',
};

interface Props {
  phase: string;
  onPhaseChange: (phase: string) => void;
}

export const StepPhaseSelection: React.FC<Props> = ({ phase, onPhaseChange }) => {
  return (
    <div className="space-y-5 p-1">
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold">Which phase is your project in?</h3>
        <p className="text-xs text-muted-foreground">
          This determines which ORA activities are loaded from the catalog.
        </p>
      </div>

      <div className="grid gap-2">
        {PROJECT_PHASES.map((p, i) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onPhaseChange(p.value)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-lg border text-left transition-all",
              phase === p.value
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              phase === p.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground"
            )}>
              {PHASE_ICONS[p.value]}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold">{p.label}</span>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {PHASE_DESCRIPTIONS[p.value]}
              </p>
            </div>
            <div className={cn(
              "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
              phase === p.value ? "border-primary" : "border-muted-foreground/30"
            )}>
              {phase === p.value && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
