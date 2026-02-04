import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, FileText, Plus, ChevronRight } from 'lucide-react';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { useProjectPSSRs } from '@/hooks/useProjectPSSRs';
import { useProjectVCRs } from '@/hooks/useProjectVCRs';
import { useProjectORPPlans } from '@/hooks/useProjectORPPlans';
import { PSSRQuickViewOverlay } from '@/components/pssr/PSSRQuickViewOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateVCRWizard } from './vcr-wizard/CreateVCRWizard';
import { P2AWorkspaceOverlay } from './P2AWorkspaceOverlay';
import { P2APlanCreationWizard } from './p2a-wizard/P2APlanCreationWizard';
import { cn } from '@/lib/utils';
import { useCanCreateVCR } from '@/hooks/useCurrentUserRole';
import { useP2AHandoverPlan } from '@/components/p2a-workspace/hooks/useP2AHandoverPlan';

interface PSSRSummaryWidgetProps {
  projectId: string;
  projectCode?: string;
  dragAttributes?: any;
  dragListeners?: any;
  onHide?: () => void;
}

// Circular progress component for compact display
const CircularProgress: React.FC<{ value: number; size?: number; strokeWidth?: number; className?: string }> = ({
  value,
  size = 36,
  strokeWidth = 3,
  className
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-300"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold">{value}%</span>
    </div>
  );
};


export const PSSRSummaryWidget: React.FC<PSSRSummaryWidgetProps> = ({ 
  projectId, 
  projectCode = '',
  dragAttributes, 
  dragListeners, 
  onHide 
}) => {
  const { data: pssrs, isLoading: pssrsLoading } = useProjectPSSRs(projectId);
  const { data: vcrs, isLoading: vcrsLoading } = useProjectVCRs(projectId);
  const { data: orpPlans, isLoading: orpLoading } = useProjectORPPlans(projectId);
  const { canCreate: canCreateVCR, isLoading: roleLoading } = useCanCreateVCR();
  const [selectedPSSR, setSelectedPSSR] = useState<{ id: string; displayId: string } | null>(null);
  const [showCreateVCR, setShowCreateVCR] = useState(false);
  const [showP2AWorkspace, setShowP2AWorkspace] = useState(false);
  const [showP2APlanWizard, setShowP2APlanWizard] = useState(false);

  // Get the first (active) ORA plan for this project
  const oraPlanId = orpPlans?.[0]?.id || '';
  const { plan: p2aPlan } = useP2AHandoverPlan(oraPlanId);
  const isLoading = pssrsLoading || vcrsLoading;

  // Use only real VCRs from database
  const allVCRs = vcrs || [];

  const handlePSSRClick = (pssrId: string, displayId: string) => {
    setSelectedPSSR({ id: pssrId, displayId });
  };

  const handleVCRClick = (vcrId: string) => {
    // TODO: Open VCR detail overlay
    console.log('VCR clicked:', vcrId);
  };

  const hasContent = (pssrs && pssrs.length > 0) || allVCRs.length > 0;

  return (
    <>
      <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-red-500/20 group">
        <CardHeader {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing pb-3">
          <CardTitle className="text-lg flex items-center gap-3">
            <StyledWidgetIcon 
              Icon={Key}
              gradientFrom="from-orange-500"
              gradientTo="to-amber-500"
              glowFrom="from-orange-500/40"
              glowTo="to-amber-500/40"
            />
            <span>P2A Handover</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-3 pt-0">
          <div className="flex-1">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 border rounded-lg bg-muted/30">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : allVCRs.length > 0 ? (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {allVCRs.map((vcr) => (
                  <div 
                    key={vcr.id} 
                    className="flex items-center gap-3 p-2.5 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer group/item"
                    onClick={() => handleVCRClick(vcr.id)}
                  >
                    <CircularProgress value={vcr.progress} className="text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-blue-600/70">{vcr.vcr_code}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {vcr.status === 'PENDING' ? 'Draft' : vcr.status}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium truncate">{vcr.name}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                ))}
                {canCreateVCR && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-xs border-dashed"
                    onClick={() => setShowCreateVCR(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    New VCR
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm font-medium mb-1">No P2A Handover Plan</p>
                <p className="text-xs opacity-70 mb-5">Set up your handover workflow with systems and VCRs</p>
                {canCreateVCR && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowP2APlanWizard(true)}
                  >
                    Create P2A Handover Plan
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* View Handover Plan Button - Show only when VCRs exist */}
          {allVCRs.length > 0 && oraPlanId && (
            <div className="flex items-center gap-2 mt-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setShowP2AWorkspace(true)}
              >
                P2A Handover Plan
                {p2aPlan?.status && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "ml-2 text-[9px] px-1.5 py-0",
                      p2aPlan.status === 'DRAFT' && "bg-slate-100 text-slate-600 border-slate-200",
                      p2aPlan.status === 'ACTIVE' && "bg-amber-50 text-amber-700 border-amber-200",
                      p2aPlan.status === 'COMPLETED' && "bg-emerald-50 text-emerald-700 border-emerald-200"
                    )}
                  >
                    {p2aPlan.status === 'ACTIVE' ? 'In Review' : p2aPlan.status === 'COMPLETED' ? 'Approved' : 'Draft'}
                  </Badge>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PSSR Quick View Overlay */}
      {selectedPSSR && (
        <PSSRQuickViewOverlay
          open={!!selectedPSSR}
          onOpenChange={(open) => !open && setSelectedPSSR(null)}
          pssrId={selectedPSSR.id}
          pssrDisplayId={selectedPSSR.displayId}
        />
      )}

      {/* Create VCR Wizard */}
      <CreateVCRWizard
        open={showCreateVCR}
        onOpenChange={setShowCreateVCR}
        projectId={projectId}
        projectCode={projectCode}
      />

      {/* P2A Handover Workspace Overlay */}
      <P2AWorkspaceOverlay
        open={showP2AWorkspace}
        onOpenChange={setShowP2AWorkspace}
        oraPlanId={oraPlanId}
        projectName={projectCode}
        projectNumber={projectCode}
      />

      {/* P2A Plan Creation Wizard */}
      <P2APlanCreationWizard
        open={showP2APlanWizard}
        onOpenChange={setShowP2APlanWizard}
        projectId={projectId}
        projectCode={projectCode}
        projectName={projectCode}
        onSuccess={() => {
          setShowP2APlanWizard(false);
        }}
        onOpenWorkspace={() => {
          setShowP2APlanWizard(false);
          setShowP2AWorkspace(true);
        }}
      />
    </>
  );
};
