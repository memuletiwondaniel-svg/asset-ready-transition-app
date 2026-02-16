import React from 'react';
import { PROJECT_PHASES } from './types';
import { cn } from '@/lib/utils';
import { Search, FileCheck, ListFilter, PenLine, Rocket } from 'lucide-react';

const PHASE_CONFIG: Record<string, {
  icon: React.ReactNode;
  description: string;
  hoverBg: string;
  hoverBorder: string;
  hoverIcon: string;
}> = {
  IDENTIFY: {
    icon: <Search className="w-5 h-5" />,
    description: 'Identify hazards, risks & opportunities early in the project lifecycle',
    hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
    hoverIcon: 'group-hover/phase:bg-blue-100 group-hover/phase:text-blue-600 dark:group-hover/phase:bg-blue-900/50 dark:group-hover/phase:text-blue-400',
  },
  ASSESS: {
    icon: <FileCheck className="w-5 h-5" />,
    description: 'Assess risk levels and evaluate mitigation options',
    hoverBg: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
    hoverIcon: 'group-hover/phase:bg-amber-100 group-hover/phase:text-amber-600 dark:group-hover/phase:bg-amber-900/50 dark:group-hover/phase:text-amber-400',
  },
  SELECT: {
    icon: <ListFilter className="w-5 h-5" />,
    description: 'Select preferred alternatives and risk treatment strategies',
    hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-950/30',
    hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-700',
    hoverIcon: 'group-hover/phase:bg-purple-100 group-hover/phase:text-purple-600 dark:group-hover/phase:bg-purple-900/50 dark:group-hover/phase:text-purple-400',
  },
  DEFINE: {
    icon: <PenLine className="w-5 h-5" />,
    description: 'Define detailed scope, plans and deliverables',
    hoverBg: 'hover:bg-teal-50 dark:hover:bg-teal-950/30',
    hoverBorder: 'hover:border-teal-300 dark:hover:border-teal-700',
    hoverIcon: 'group-hover/phase:bg-teal-100 group-hover/phase:text-teal-600 dark:group-hover/phase:bg-teal-900/50 dark:group-hover/phase:text-teal-400',
  },
  EXECUTE: {
    icon: <Rocket className="w-5 h-5" />,
    description: 'Execute the plan and manage operational readiness activities',
    hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    hoverIcon: 'group-hover/phase:bg-emerald-100 group-hover/phase:text-emerald-600 dark:group-hover/phase:bg-emerald-900/50 dark:group-hover/phase:text-emerald-400',
  },
};

const SELECTED_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  IDENTIFY: { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-400 dark:border-blue-600 ring-1 ring-blue-200 dark:ring-blue-800', icon: 'bg-blue-500 text-white' },
  ASSESS: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-400 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-800', icon: 'bg-amber-500 text-white' },
  SELECT: { bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-400 dark:border-purple-600 ring-1 ring-purple-200 dark:ring-purple-800', icon: 'bg-purple-500 text-white' },
  DEFINE: { bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-400 dark:border-teal-600 ring-1 ring-teal-200 dark:ring-teal-800', icon: 'bg-teal-500 text-white' },
  EXECUTE: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-200 dark:ring-emerald-800', icon: 'bg-emerald-500 text-white' },
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
        {PROJECT_PHASES.map((p) => {
          const config = PHASE_CONFIG[p.value];
          const selected = SELECTED_STYLES[p.value];
          const isSelected = phase === p.value;

          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onPhaseChange(p.value)}
              className={cn(
                "group/phase w-full flex items-center gap-4 px-4 py-3 rounded-lg border text-left transition-all duration-200",
                isSelected
                  ? cn(selected.bg, selected.border)
                  : cn("border-border", config.hoverBg, config.hoverBorder)
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                isSelected
                  ? selected.icon
                  : cn("bg-muted/60 text-muted-foreground", config.hoverIcon)
              )}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold">{p.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {config.description}
                </p>
              </div>
              <div className={cn(
                "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                isSelected ? cn("border-current", selected.icon.includes('blue') ? 'border-blue-500' : selected.icon.includes('amber') ? 'border-amber-500' : selected.icon.includes('purple') ? 'border-purple-500' : selected.icon.includes('teal') ? 'border-teal-500' : 'border-emerald-500') : "border-muted-foreground/30"
              )}>
                {isSelected && <div className={cn(
                  "w-2 h-2 rounded-full",
                  p.value === 'IDENTIFY' ? 'bg-blue-500' : p.value === 'ASSESS' ? 'bg-amber-500' : p.value === 'SELECT' ? 'bg-purple-500' : p.value === 'DEFINE' ? 'bg-teal-500' : 'bg-emerald-500'
                )} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
