import React from 'react';
import { Wand2, LayoutGrid } from 'lucide-react';

interface ProjectOverviewStepProps {
  projectId: string;
  projectCode: string;
  projectName?: string;
  plantName?: string;
  milestones?: Array<{ id: string; name: string; target_date?: string }>;
  onChooseWizard: () => void;
  onChooseWorkspace: () => void;
}

export const ProjectOverviewStep: React.FC<ProjectOverviewStepProps> = ({
  projectId,
  projectCode,
  projectName,
  plantName,
  milestones = [],
  onChooseWizard,
  onChooseWorkspace,
}) => {
  const displayName = projectName && projectName !== projectCode 
    ? `${projectCode}: ${projectName}` 
    : projectCode;

  return (
    <div className="flex flex-col p-5 h-full">
      {/* What we'll create */}
      <div className="space-y-3 flex-1">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What you'll set up</h4>
        <div className="grid gap-2.5 text-sm">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/30 dark:border-blue-800/30">
            <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 text-xs font-semibold shrink-0">1</div>
            <span><strong>Systems</strong> — Import or create systems for handover</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/30 dark:border-emerald-800/30">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xs font-semibold shrink-0">2</div>
            <span><strong>VCRs</strong> — Define Verification Certificate of Readiness</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-800/30">
            <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 text-xs font-semibold shrink-0">3</div>
            <span><strong>Mapping</strong> — Link systems to VCRs and phases</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/30 dark:border-purple-800/30">
            <div className="w-7 h-7 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 text-xs font-semibold shrink-0">4</div>
            <span><strong>Approval</strong> — Set up the review workflow</span>
          </div>
        </div>
      </div>

      {/* Choose approach */}
      <div className="pt-4 border-t mt-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Choose your approach</h4>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onChooseWizard}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <Wand2 className="h-7 w-7 text-primary" />
            <div className="text-center">
              <div className="text-sm font-semibold">Guided Wizard</div>
              <div className="text-xs text-muted-foreground mt-0.5">Step-by-step with guidance</div>
            </div>
          </button>
          <button
            onClick={onChooseWorkspace}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-muted hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <LayoutGrid className="h-7 w-7 text-muted-foreground" />
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
