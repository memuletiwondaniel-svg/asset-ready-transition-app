import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { X, Key, Cable, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { P2AHandoverWorkspace } from '@/components/p2a-workspace/P2AHandoverWorkspace';
import { useP2AHandoverPlan } from '@/components/p2a-workspace/hooks/useP2AHandoverPlan';
import { useP2APlanWizard } from '@/hooks/useP2APlanWizard';
import { SubmissionSuccessDialog } from './p2a-wizard/SubmissionSuccessDialog';
import { cn } from '@/lib/utils';

import { getP2APlanUIState } from '@/lib/p2aPlanStatus';

interface P2AWorkspaceOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReturnToWizard?: () => void;
  projectId: string;
  projectName?: string;
  projectNumber?: string;
  readOnly?: boolean;
}
export const P2AWorkspaceOverlay: React.FC<P2AWorkspaceOverlayProps> = ({
  open,
  onOpenChange,
  onReturnToWizard,
  projectId,
  projectName,
  projectNumber,
  readOnly = false,
}) => {
  const [showMapping, setShowMapping] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [showSubmission, setShowSubmission] = useState(false);
  const { plan } = useP2AHandoverPlan(projectId, 'project_id');
  const planUIState = getP2APlanUIState(plan?.status);
  const statusConfig = { label: planUIState.badgeLabel, className: planUIState.badgeClass };
  const { loadDraft: loadP2ADraft, state: p2aWizardState } = useP2APlanWizard(projectId, projectNumber || '');

  const handleZoomIn = () => setZoomLevel(prev => Math.min(1.2, Math.round((prev + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.4, Math.round((prev - 0.1) * 10) / 10));
  const handleZoomReset = () => setZoomLevel(1.0);

  const handleStatusClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!planUIState.isLocked || !plan?.id) return;
    await loadP2ADraft();
    setShowSubmission(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!inset-4 sm:!inset-4 sm:!max-w-none sm:!max-h-none sm:!translate-x-0 sm:!translate-y-0 sm:!left-4 sm:!top-4 !w-[calc(100vw-32px)] !h-[calc(100vh-32px)] p-0 gap-0 overflow-hidden rounded-xl sm:!rounded-xl [&>button]:hidden border-border/50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-gradient-to-r from-background via-muted/30 to-background backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 to-amber-500/40 rounded-lg blur-sm" />
              <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                <Key className="h-4 w-4 text-white" />
              </div>
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {readOnly || planUIState.isLocked
                ? `${projectNumber ? projectNumber + ' ' : ''}P2A Plan`
                : 'Develop P2A Plan'}
            </h2>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                statusConfig.className,
                planUIState.isLocked && "cursor-pointer hover:opacity-80 transition-opacity"
              )}
              onClick={planUIState.isLocked ? handleStatusClick : undefined}
              role={planUIState.isLocked ? 'button' : undefined}
              tabIndex={planUIState.isLocked ? 0 : undefined}
            >
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              {/* Mapping Toggle — clearly pressable on/off */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showMapping ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowMapping(!showMapping)}
                    aria-pressed={showMapping}
                    className={cn(
                      "h-7 gap-1.5 text-xs",
                      showMapping
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Cable className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{showMapping ? 'Mapping on' : 'Show mapping'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {showMapping ? 'Hide system-to-VCR connections' : 'Show system-to-VCR connections'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onOpenChange(false);
                if (!readOnly) {
                  onReturnToWizard?.();
                }
              }}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Workspace Content */}
        <div className="flex-1 overflow-hidden relative" style={{ height: 'calc(100vh - 16px - 45px)' }}>
          <P2AHandoverWorkspace
            projectId={projectId}
            projectName={projectName}
            projectNumber={projectNumber}
            showMapping={showMapping}
            zoomLevel={zoomLevel}
          />

          {/* Demoted zoom control — quiet, floating in the canvas corner */}
          <TooltipProvider>
            <div className="absolute bottom-3 right-3 z-30 flex items-center gap-0.5 rounded-md border border-border/40 bg-background/70 backdrop-blur px-1 py-0.5 shadow-sm opacity-60 hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 0.4}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Zoom out</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomReset}
                    className="h-6 px-1 text-[10px] font-mono text-muted-foreground hover:text-foreground"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Reset zoom</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 1.2}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Zoom in</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </DialogContent>
      {plan?.id && (
        <SubmissionSuccessDialog
          open={showSubmission}
          onOpenChange={setShowSubmission}
          planId={plan.id}
          projectId={projectId}
          projectCode={projectNumber || ''}
          projectName={projectName}
          systems={p2aWizardState.systems}
          vcrs={p2aWizardState.vcrs}
          phases={p2aWizardState.phases}
          approvers={p2aWizardState.approvers}
          onDone={() => setShowSubmission(false)}
        />
      )}
    </Dialog>
  );
};
