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
  // Format display name as "DP-300: Project Name"
  const displayName = projectName && projectName !== projectCode 
    ? `${projectCode}: ${projectName}` 
    : projectCode;

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* What we'll create - horizontal layout */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What you'll set up</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/30 dark:border-blue-800/30">
            <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 text-[10px] font-medium">1</div>
            <span><strong>Systems</strong> - Import for handover</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/30 dark:border-emerald-800/30">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-[10px] font-medium">2</div>
            <span><strong>VCRs</strong> - Verification checkpoints</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-800/30">
            <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 text-[10px] font-medium">3</div>
            <span><strong>Mapping</strong> - Link to VCRs & phases</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/30 dark:border-purple-800/30">
            <div className="w-5 h-5 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 text-[10px] font-medium">4</div>
            <span><strong>Approval</strong> - Review workflow</span>
          </div>
        </div>
      </div>

      {/* Choose approach */}
      <div className="pt-3 border-t">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Choose your approach</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onChooseWizard}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <Wand2 className="h-6 w-6 text-primary" />
            <div className="text-center">
              <div className="text-sm font-semibold">Guided Wizard</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Step-by-step with guidance</div>
            </div>
          </button>
          <button
            onClick={onChooseWorkspace}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-muted hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <LayoutGrid className="h-6 w-6 text-muted-foreground" />
            <div className="text-center">
              <div className="text-sm font-semibold">Interactive Workspace</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Blank canvas for manual setup</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
