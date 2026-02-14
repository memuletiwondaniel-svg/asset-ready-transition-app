import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { X, Key, Cable, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { P2AHandoverWorkspace } from '@/components/p2a-workspace/P2AHandoverWorkspace';
import { useP2AHandoverPlan } from '@/components/p2a-workspace/hooks/useP2AHandoverPlan';
import { cn } from '@/lib/utils';

interface P2AWorkspaceOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReturnToWizard?: () => void;
  projectId: string;
  projectName?: string;
  projectNumber?: string;
}

const getStatusConfig = (status?: string) => {
  switch (status) {
    case 'DRAFT':
      return {
        label: 'Draft',
        className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      };
    case 'ACTIVE':
    case 'IN_PROGRESS':
    case 'IN_REVIEW':
      return {
        label: 'In Review',
        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
      };
    case 'COMPLETED':
    case 'APPROVED':
      return {
        label: 'Approved',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      };
    case 'ARCHIVED':
      return {
        label: 'Archived',
        className: 'bg-muted text-muted-foreground border-border',
      };
    default:
      return {
        label: 'Draft',
        className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      };
  }
};

export const P2AWorkspaceOverlay: React.FC<P2AWorkspaceOverlayProps> = ({
  open,
  onOpenChange,
  onReturnToWizard,
  projectId,
  projectName,
  projectNumber,
}) => {
  const [showMapping, setShowMapping] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const { plan } = useP2AHandoverPlan(projectId, 'project_id');
  const statusConfig = getStatusConfig(plan?.status);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(1.2, Math.round((prev + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.6, Math.round((prev - 0.1) * 10) / 10));
  const handleZoomReset = () => setZoomLevel(1.0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[99vw] w-full h-[99vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gradient-to-br from-primary/5 via-accent/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 to-amber-500/40 rounded-lg blur-sm" />
              <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                <Key className="h-4 w-4 text-white" />
              </div>
            </div>
            <h2 className="text-lg font-semibold">Create P2A Plan</h2>
            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              {/* Zoom Controls */}
              <div className="flex items-center gap-0.5 mr-2 border-r border-border pr-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 0.6}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Zoom out</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomReset}
                      className="h-7 px-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground"
                    >
                      {Math.round(zoomLevel * 100)}%
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Reset zoom</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 1.2}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Zoom in</TooltipContent>
                </Tooltip>
              </div>

              {/* Mapping Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showMapping ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setShowMapping(!showMapping)}
                    className={cn(
                      "h-7 gap-1.5 text-xs",
                      showMapping
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Cable className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Mapping</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {showMapping ? 'Hide connection diagram' : 'Show system-to-VCR connections'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onOpenChange(false);
                onReturnToWizard?.();
              }}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Workspace Content */}
        <div className="flex-1 overflow-hidden h-[calc(99vh-49px)]">
          <P2AHandoverWorkspace
            projectId={projectId}
            projectName={projectName}
            projectNumber={projectNumber}
            showMapping={showMapping}
            zoomLevel={zoomLevel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
