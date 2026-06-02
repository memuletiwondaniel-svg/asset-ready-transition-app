import React from 'react';
import { Wand2, LayoutGrid, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectOverviewStepProps {
  projectId: string;
  projectCode: string;
  projectName?: string;
  plantName?: string;
  milestones?: Array<{ id: string; name: string; target_date?: string }>;
  selectedApproach?: 'wizard' | 'workspace' | null;
  onSelectApproach?: (approach: 'wizard' | 'workspace') => void;
}

export const ProjectOverviewStep: React.FC<ProjectOverviewStepProps> = ({
  projectCode,
  projectName,
  selectedApproach = null,
  onSelectApproach,
}) => {
  const isWizard = selectedApproach === 'wizard';
  const isWorkspace = selectedApproach === 'workspace';

  return (
    <div className="flex flex-col p-5 sm:p-6 h-full max-w-3xl mx-auto w-full">
      {/* What you'll set up */}
      <div className="space-y-3 flex-1">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          What you'll set up
        </h4>
        <div className="grid gap-2 text-sm">
          {[
            { n: 1, color: 'blue', title: 'Systems', desc: 'Import or create systems for handover' },
            { n: 2, color: 'emerald', title: 'VCRs', desc: 'Define Verification Certificate of Readiness' },
            { n: 3, color: 'amber', title: 'Mapping', desc: 'Link systems to VCRs and phases' },
            { n: 4, color: 'purple', title: 'Approval', desc: 'Set up the review workflow' },
          ].map((it) => (
            <div
              key={it.n}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border bg-card',
                'border-border/60'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                  it.color === 'blue' && 'bg-blue-500/10 text-blue-600',
                  it.color === 'emerald' && 'bg-emerald-500/10 text-emerald-600',
                  it.color === 'amber' && 'bg-amber-500/10 text-amber-600',
                  it.color === 'purple' && 'bg-purple-500/10 text-purple-600',
                )}
              >
                {it.n}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{it.title}</span>
                <span className="text-muted-foreground"> — {it.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Choose your approach */}
      <div className="pt-5 border-t mt-5">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Choose your approach
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onSelectApproach?.('wizard')}
            className={cn(
              'group/approach relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden',
              'hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_hsl(217,91%,60%,0.55)]',
              isWizard
                ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20'
                : 'border-border hover:border-blue-500/60 hover:bg-blue-500/[0.04]'
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 group-hover/approach:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.08) 0%, transparent 60%)' }}
            />
            {isWizard && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white z-10">
                <Check className="w-3 h-3" />
              </span>
            )}
            <Wand2
              className={cn(
                'h-7 w-7 transition-all duration-300 relative',
                isWizard
                  ? 'text-blue-500 scale-110'
                  : 'text-muted-foreground group-hover/approach:text-blue-500 group-hover/approach:scale-110 group-hover/approach:-rotate-6'
              )}
            />
            <div className="text-center relative">
              <div className={cn(
                'text-sm font-semibold transition-colors',
                isWizard ? 'text-blue-600 dark:text-blue-400' : 'group-hover/approach:text-blue-600 dark:group-hover/approach:text-blue-400'
              )}>
                Guided Wizard
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 group-hover/approach:text-foreground/70 transition-colors">
                Step-by-step with guidance
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onSelectApproach?.('workspace')}
            className={cn(
              'group/approach relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden',
              'hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_hsl(262,83%,58%,0.55)]',
              isWorkspace
                ? 'border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/20'
                : 'border-border hover:border-purple-500/60 hover:bg-purple-500/[0.04]'
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 group-hover/approach:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(135deg, hsl(262 83% 58% / 0.08) 0%, transparent 60%)' }}
            />
            {isWorkspace && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 text-white z-10">
                <Check className="w-3 h-3" />
              </span>
            )}
            <LayoutGrid
              className={cn(
                'h-7 w-7 transition-all duration-300 relative',
                isWorkspace
                  ? 'text-purple-500 scale-110'
                  : 'text-muted-foreground group-hover/approach:text-purple-500 group-hover/approach:scale-110'
              )}
            />
            <div className="text-center relative">
              <div className={cn(
                'text-sm font-semibold transition-colors',
                isWorkspace ? 'text-purple-600 dark:text-purple-400' : 'group-hover/approach:text-purple-600 dark:group-hover/approach:text-purple-400'
              )}>
                Interactive Workspace
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 group-hover/approach:text-foreground/70 transition-colors">
                Blank canvas for manual setup
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
