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
              'relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all text-left',
              isWizard
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40 hover:bg-muted/40'
            )}
          >
            {isWizard && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
                <Check className="w-3 h-3" />
              </span>
            )}
            <Wand2 className={cn('h-7 w-7', isWizard ? 'text-primary' : 'text-muted-foreground')} />
            <div className="text-center">
              <div className="text-sm font-semibold">Guided Wizard</div>
              <div className="text-xs text-muted-foreground mt-0.5">Step-by-step with guidance</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onSelectApproach?.('workspace')}
            className={cn(
              'relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all text-left',
              isWorkspace
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40 hover:bg-muted/40'
            )}
          >
            {isWorkspace && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
                <Check className="w-3 h-3" />
              </span>
            )}
            <LayoutGrid className={cn('h-7 w-7', isWorkspace ? 'text-primary' : 'text-muted-foreground')} />
            <div className="text-center">
              <div className="text-sm font-semibold">Interactive Workspace</div>
              <div className="text-xs text-muted-foreground mt-0.5">Blank canvas for manual setup</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
