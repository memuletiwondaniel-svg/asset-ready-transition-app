import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, FileText, Plus, ChevronRight, Pencil, ExternalLink } from 'lucide-react';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { VCRCard } from './VCRCard';
import { useProjectPSSRs } from '@/hooks/useProjectPSSRs';
import { useProjectVCRs, ProjectVCR } from '@/hooks/useProjectVCRs';
import { useProjectORPPlans } from '@/hooks/useProjectORPPlans';
import { useProjectMilestones } from '@/hooks/useProjects';
import { PSSRQuickViewOverlay } from '@/components/pssr/PSSRQuickViewOverlay';
import { PSSRDetailOverlay } from '@/components/pssr/PSSRDetailOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateVCRWizard } from './vcr-wizard/CreateVCRWizard';
import { P2AWorkspaceOverlay } from './P2AWorkspaceOverlay';
import { P2APlanSummaryDialog } from './P2APlanSummaryDialog';
import { P2APlanCreationWizard } from './p2a-wizard/P2APlanCreationWizard';
import { VCRDetailOverlayWidget } from './VCRDetailOverlay';
import { cn } from '@/lib/utils';
import { useCanCreateVCRPermission } from '@/hooks/usePermissions';
import { useP2AHandoverPlan } from '@/components/p2a-workspace/hooks/useP2AHandoverPlan';
import { useP2APlanByProject } from '@/hooks/useP2APlanByProject';

interface PSSRSummaryWidgetProps {
  projectId: string;
  projectCode?: string;
  projectName?: string;
  dragAttributes?: any;
  dragListeners?: any;
  onHide?: () => void;
  isReadOnly?: boolean;
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
  projectName,
  dragAttributes, 
  dragListeners, 
  onHide 
}) => {
  const { data: pssrs, isLoading: pssrsLoading } = useProjectPSSRs(projectId);
  const { data: vcrs, isLoading: vcrsLoading } = useProjectVCRs(projectId);
  const { data: orpPlans, isLoading: orpLoading } = useProjectORPPlans(projectId);
  const { milestones: projectMilestones } = useProjectMilestones(projectId);
  const { canCreate: canCreateVCR, isLoading: roleLoading } = useCanCreateVCRPermission();
  const [selectedPSSR, setSelectedPSSR] = useState<{ id: string; displayId: string } | null>(null);
  const [overlayPSSR, setOverlayPSSR] = useState<{ id: string; displayId: string; title: string; status: string } | null>(null);
  const [showCreateVCR, setShowCreateVCR] = useState(false);
  const [showP2AWorkspace, setShowP2AWorkspace] = useState(false);
  const [showP2APlanWizard, setShowP2APlanWizard] = useState(false);
  const [showP2ASummary, setShowP2ASummary] = useState(false);
  const [selectedVCR, setSelectedVCR] = useState<ProjectVCR | null>(null);

  // Get the first (active) ORA plan for this project
  const oraPlanId = orpPlans?.[0]?.id || '';
  const oraStatus = orpPlans?.[0]?.status;
  const oraApproved = oraStatus === 'APPROVED' || oraStatus === 'IN_PROGRESS' || oraStatus === 'COMPLETED';
  const { plan: p2aPlan } = useP2AHandoverPlan(oraPlanId);
  const { data: p2aPlanByProject, isLoading: p2aPlanLoading } = useP2APlanByProject(projectId);
  const isLoading = pssrsLoading || vcrsLoading || p2aPlanLoading;

  // Plan is approved when status is COMPLETED
  const planIsApproved = p2aPlanByProject?.status === 'COMPLETED';
  const hasPlan = !!p2aPlanByProject;
  // Map project milestones to the format the wizard expects
  const wizardMilestones = (projectMilestones || []).map(m => ({
    id: m.id,
    name: m.milestone_name,
    target_date: m.milestone_date,
  }));

  // Sort VCRs by vcr_code for sequential display
  const allVCRs = [...(vcrs || [])].sort((a, b) => (a.vcr_code || '').localeCompare(b.vcr_code || ''));

  // VCRs should only be shown in the widget after the plan is approved
  const showVCRList = planIsApproved && allVCRs.length > 0;

  const handlePSSRClick = (pssrId: string, displayId: string) => {
    setSelectedPSSR({ id: pssrId, displayId });
  };

  const handleVCRClick = (vcrId: string) => {
    const found = allVCRs.find(v => v.id === vcrId);
    if (found) setSelectedVCR(found);
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
            <span>P2A Plan</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-3 pt-2">
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
            ) : showVCRList ? (
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
                {allVCRs.map((vcr) => (
                  <VCRCard
                    key={vcr.id}
                    vcr={vcr}
                    onClick={handleVCRClick}
                  />
                ))}
                {canCreateVCR && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 text-xs border-dashed border-foreground/10 hover:border-foreground/20 hover:bg-muted/40 transition-all rounded-xl h-9"
                    onClick={() => setShowCreateVCR(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    New VCR
                  </Button>
                )}
              </div>
            ) : p2aPlanByProject ? (
              // Plan exists — show different UI based on status
              <div className="text-center py-10 text-muted-foreground">
                <p 
                  className={cn(
                    "text-sm font-medium mb-1",
                    p2aPlanByProject.status !== 'DRAFT' && "cursor-pointer hover:text-foreground hover:underline transition-colors"
                  )}
                  onClick={() => {
                    if (p2aPlanByProject.status !== 'DRAFT') {
                      setShowP2ASummary(true);
                    }
                  }}
                >
                  P2A Plan
                </p>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "mb-3 text-[10px] px-2 py-0.5",
                    p2aPlanByProject.status === 'DRAFT' && "bg-muted text-muted-foreground border-border",
                    p2aPlanByProject.status === 'ACTIVE' && "bg-amber-50 text-amber-700 border-amber-200",
                    p2aPlanByProject.status === 'COMPLETED' && "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}
                >
                  {p2aPlanByProject.status === 'ACTIVE' ? 'In Review' : p2aPlanByProject.status === 'COMPLETED' ? 'Approved' : 'Draft'}
                </Badge>
                {p2aPlanByProject.status === 'DRAFT' ? (
                  <>
                    <p className="text-xs opacity-70 mb-5">Continue setting up your handover plan</p>
                    {canCreateVCR && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs gap-1.5"
                        onClick={() => setShowP2APlanWizard(true)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Continue Setup
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs opacity-70 mb-5">
                      {p2aPlanByProject.status === 'ACTIVE' ? 'Your plan is awaiting approval' : 'Your plan has been approved'}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        if (p2aPlanByProject.status === 'COMPLETED') {
                          setShowP2AWorkspace(true);
                        } else {
                          setShowP2APlanWizard(true);
                        }
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {['COMPLETED', 'APPROVED', 'ACTIVE'].includes(p2aPlanByProject.status)
                        ? 'View P2A Plan'
                        : 'Continue P2A Plan'}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                {oraApproved ? (
                  <>
                    <p className="text-sm font-medium mb-1">No P2A Plan</p>
                    <p className="text-xs opacity-70 mb-5">Set up your handover workflow with systems and VCRs</p>
                    {canCreateVCR && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                        onClick={() => setShowP2APlanWizard(true)}
                      >
                        Develop P2A Plan
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium mb-1">No P2A Plan</p>
                    <p className="text-xs opacity-70">ORA Plan must be approved before creating a P2A Plan</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* View Handover Plan Button - Show when plan exists and is approved */}
          {hasPlan && planIsApproved && (
            <div className="flex items-center gap-2 mt-auto pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setShowP2ASummary(true)}
              >
                P2A Plan
                <Badge 
                  variant="outline" 
                  className="ml-2 text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  Approved
                </Badge>
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
          onViewFullDetails={(id, displayId) => {
            setSelectedPSSR(null);
            const pssr = pssrs?.find(p => p.id === id);
            setOverlayPSSR({
              id,
              displayId,
              title: pssr?.asset || '',
              status: pssr?.status || '',
            });
          }}
        />
      )}

      {/* PSSR Detail Overlay */}
      {overlayPSSR && (
        <PSSRDetailOverlay
          open={!!overlayPSSR}
          onOpenChange={(open) => !open && setOverlayPSSR(null)}
          pssrId={overlayPSSR.id}
          pssrDisplayId={overlayPSSR.displayId}
          pssrTitle={overlayPSSR.title}
          status={overlayPSSR.status}
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
        onReturnToWizard={() => {
          setShowP2APlanWizard(true);
        }}
        projectId={projectId}
        projectName={projectCode}
        projectNumber={projectCode}
        readOnly={p2aPlanByProject?.status === 'ACTIVE'}
      />

      {/* P2A Plan Summary Dialog */}
      {p2aPlanByProject && (
        <P2APlanSummaryDialog
          open={showP2ASummary}
          onOpenChange={setShowP2ASummary}
          planId={p2aPlanByProject.id}
          planStatus={p2aPlanByProject.status}
          onOpenWorkspace={() => {
            setShowP2ASummary(false);
            setShowP2AWorkspace(true);
          }}
        />
      )}

      {/* P2A Plan Creation Wizard */}
      <P2APlanCreationWizard
        open={showP2APlanWizard}
        onOpenChange={setShowP2APlanWizard}
        projectId={projectId}
        projectCode={projectCode}
        projectName={projectName}
        milestones={wizardMilestones}
        onSuccess={() => {
          setShowP2APlanWizard(false);
        }}
        onOpenWorkspace={() => {
          setShowP2APlanWizard(false);
          setShowP2AWorkspace(true);
        }}
      />

      {selectedVCR && (
        <VCRDetailOverlayWidget
          open={!!selectedVCR}
          onOpenChange={(open) => { if (!open) setSelectedVCR(null); }}
          vcr={selectedVCR}
          projectName={projectName}
          projectCode={projectCode}
        />
      )}
    </>
  );
};
