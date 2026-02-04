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
    <div className="space-y-6 p-6">
      {/* What we'll create */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">What you'll set up:</h4>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50">
            <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
              1
            </div>
            <span><strong>Systems</strong> - Import or create systems for handover</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              2
            </div>
            <span><strong>VCRs</strong> - Define verification checkpoints</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              3
            </div>
            <span><strong>Mapping</strong> - Link systems to VCRs and phases</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/50">
            <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
              4
            </div>
            <span><strong>Approval</strong> - Set up the review workflow</span>
          </div>
        </div>
      </div>

      {/* Choose approach */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium mb-3">Choose your approach:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onChooseWizard}
            className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors text-left"
          >
            <Wand2 className="h-8 w-8 text-primary" />
            <div className="text-center">
              <div className="font-semibold">Guided Wizard</div>
              <div className="text-xs text-muted-foreground mt-1">
                Step-by-step setup with guidance
              </div>
            </div>
          </button>
          <button
            onClick={onChooseWorkspace}
            className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-muted hover:border-primary/50 hover:bg-muted/50 transition-colors text-left"
          >
            <LayoutGrid className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold">Interactive Workspace</div>
              <div className="text-xs text-muted-foreground mt-1">
                Open blank canvas for manual setup
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
