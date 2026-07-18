import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, FileText, Plus, ChevronRight, Pencil, ExternalLink, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useP2APlanWizard } from '@/hooks/useP2APlanWizard';

import { StyledWidgetIcon } from './StyledWidgetIcon';
import { WidgetCardHeader, NarrativeSummary, InlineDivider } from './WidgetCardHeader';
import { VCRCard } from './VCRCard';
import { useProjectPSSRs } from '@/hooks/useProjectPSSRs';
import { useProjectVCRs, ProjectVCR, VCRLifecycle } from '@/hooks/useProjectVCRs';
import { useProjectORPPlans } from '@/hooks/useProjectORPPlans';
import { useProjectMilestones } from '@/hooks/useProjects';
import { PSSRQuickViewOverlay } from '@/components/pssr/PSSRQuickViewOverlay';
import { PSSRDetailOverlay } from '@/components/pssr/PSSRDetailOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateVCRWizard } from './vcr-wizard/CreateVCRWizard';
import { P2AWorkspaceOverlay } from './P2AWorkspaceOverlay';
import { P2APlanSummaryDialog } from './P2APlanSummaryDialog';
import { P2AApprovalsPanel } from './P2AApprovalsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { P2APlanCreationWizard } from './p2a-wizard/P2APlanCreationWizard';
import { SubmissionSuccessDialog } from './p2a-wizard/SubmissionSuccessDialog';
import { VCRDetailOverlayWidget } from './VCRDetailOverlay';
import { VCRExecutionPlanWizard } from './vcr-wizard/VCRExecutionPlanWizard';
import { VCRPlanReviewLauncher } from '@/components/tasks/VCRPlanReviewLauncher';
import type { VCRReviewPayload } from './vcr-wizard/wizardModeContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useCanCreateVCRPermission } from '@/hooks/usePermissions';
import { useP2AHandoverPlan } from '@/components/p2a-workspace/hooks/useP2AHandoverPlan';
import { useP2APlanByProject } from '@/hooks/useP2APlanByProject';
import { getP2APlanUIState } from '@/lib/p2aPlanStatus';


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
  const [showP2AApprovals, setShowP2AApprovals] = useState(false);
  const [selectedVCR, setSelectedVCR] = useState<ProjectVCR | null>(null);
  const [vcrInitialTab, setVcrInitialTab] = useState<string | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();

  const [wizardVCR, setWizardVCR] = useState<ProjectVCR | null>(null);
  const [reviewPayload, setReviewPayload] = useState<VCRReviewPayload | null>(null);
  const [showDeleteP2ADraft, setShowDeleteP2ADraft] = useState(false);
  const [showP2ASubmission, setShowP2ASubmission] = useState(false);
  const {
    deleteDraft: deleteP2ADraft,
    isDeleting: isDeletingP2ADraft,
    loadDraft: loadP2ADraft,
    state: p2aWizardState,
  } = useP2APlanWizard(projectId, projectCode);


  // Get the first (active) ORA plan for this project
  const oraPlanId = orpPlans?.[0]?.id || '';
  const oraStatus = orpPlans?.[0]?.status;
  const oraApproved = oraStatus === 'APPROVED' || oraStatus === 'IN_PROGRESS' || oraStatus === 'COMPLETED';
  const { plan: p2aPlan } = useP2AHandoverPlan(oraPlanId);
  const { data: p2aPlanByProject, isLoading: p2aPlanLoading } = useP2APlanByProject(projectId);
  const isLoading = pssrsLoading || vcrsLoading || p2aPlanLoading;

  // Canonical status → UI derivation. All consumers in this widget read from here.
  const planUIState = getP2APlanUIState(p2aPlanByProject?.status);
  // Plan is approved when status is COMPLETED
  const planIsApproved = planUIState.isApproved;
  const planIsLocked = planUIState.isLocked;
  const hasPlan = !!p2aPlanByProject;
  // Map project milestones to the format the wizard expects
  const wizardMilestones = (projectMilestones || []).map(m => ({
    id: m.id,
    name: m.milestone_name,
    target_date: m.milestone_date,
  }));

  // Sort VCRs by lifecycle progression (least-complete first), vcr_code tiebreaker
  const LIFECYCLE_ORDER: Record<VCRLifecycle, number> = {
    not_started: 0, draft: 1, in_progress: 2, in_approval: 3, approved: 4, handed_over: 5,
  };
  const allVCRs = [...(vcrs || [])].sort((a, b) => {
    const ra = LIFECYCLE_ORDER[a.lifecycle ?? 'not_started'] ?? 99;
    const rb = LIFECYCLE_ORDER[b.lifecycle ?? 'not_started'] ?? 99;
    return ra !== rb ? ra - rb : (a.vcr_code || '').localeCompare(b.vcr_code || '');
  });

  const vcrGroups: Array<{ key: string; label: string; items: ProjectVCR[] }> = [
    {
      key: 'action',
      label: 'Action needed',
      items: allVCRs.filter(v => {
        const lc = v.lifecycle ?? 'not_started';
        return lc === 'not_started' || lc === 'draft';
      }),
    },
    {
      key: 'progress',
      label: 'In progress',
      items: allVCRs.filter(v => {
        const lc = v.lifecycle ?? 'not_started';
        return lc === 'in_progress' || lc === 'in_approval' || lc === 'approved';
      }),
    },
    {
      key: 'completed',
      label: 'Completed',
      items: allVCRs.filter(v => (v.lifecycle ?? 'not_started') === 'handed_over'),
    },
  ];

  // VCRs should only be shown in the widget after the plan is approved
  const showVCRList = planIsApproved && allVCRs.length > 0;

  // Auto-open VCR detail overlay when ?vcr=<id>&tab=<x> is present in URL.
  useEffect(() => {
    const vcrParam = searchParams.get('vcr');
    const tabParam = searchParams.get('tab');
    if (!vcrParam || !allVCRs.length) return;
    const found = allVCRs.find((v) => v.id === vcrParam);
    if (found) {
      setSelectedVCR(found);
      setVcrInitialTab(tabParam || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVCRs.length, searchParams]);




  const handlePSSRClick = (pssrId: string, displayId: string) => {
    setSelectedPSSR({ id: pssrId, displayId });
  };

  const handleVCRClick = async (vcrId: string) => {
    const found = allVCRs.find(v => v.id === vcrId);
    if (!found) return;
    const lifecycle = found.lifecycle;
    // Wizard for editable states: not_started, draft (plan setup), in_progress (checklist work).
    const stillEditable =
      lifecycle === 'not_started' ||
      lifecycle === 'draft' ||
      (!lifecycle && (found.status || '').toUpperCase() !== 'SIGNED');
    if (stillEditable) {
      setWizardVCR(found);
      return;
    }

    // U8 routing — for an `in_approval` VCR, ALWAYS open the read-only
    // review wizard. If the viewer has an actionable approver row, the
    // wizard runs the actionable review (decision step). Otherwise it
    // launches in view-only mode (approverRowId=null) and the final step
    // renders the read-only approver-status board. Non-approvers no longer
    // fall through to the detail overlay for in_approval VCRs.
    if (lifecycle === 'in_approval') {
      let approverRow: any = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: row } = await (supabase as any)
            .from('v_vcr_plan_approver_tasks')
            .select('approver_row_id, handover_point_id, vcr_code, vcr_name, project_id, project_code, role_key, role_label, phase, user_id')
            .eq('handover_point_id', found.id)
            .eq('user_id', user.id)
            .maybeSingle();
          approverRow = row || null;
        }
      } catch (err) {
        console.warn('[PSSRSummaryWidget] approver lookup failed, opening view-only review', err);
      }
      setReviewPayload({
        approverRowId: approverRow?.approver_row_id ?? null,
        handoverPointId: approverRow?.handover_point_id ?? found.id,
        vcrCode: approverRow?.vcr_code ?? found.vcr_code,
        vcrName: approverRow?.vcr_name ?? found.name,
        projectCode: approverRow?.project_code ?? projectCode,
        projectId: approverRow?.project_id ?? projectId,
        roleKey: approverRow?.role_key ?? '',
        roleLabel: approverRow?.role_label ?? '',
        phase: approverRow?.phase ?? null,
      });
      return;
    }

    // Detail overlay (read-only) for approved / handed_over (fully-approved) VCRs.
    setSelectedVCR(found);
  };

  const hasContent = (pssrs && pssrs.length > 0) || allVCRs.length > 0;

  // Single dispatcher for the primary CTA / header click. Routes by the
  // canonical action — never branches on raw status here. Guarantees the
  // header click always produces a visible response (P1 functional
  // preservation): if the plan query is still in flight or the user lacks
  // create permission, fall back to opening the workspace read-only so the
  // user always gets feedback.
  const openPlanByAction = () => {
    // Loading — open workspace read-only so the click never silently drops.
    if (p2aPlanLoading && !p2aPlanByProject) {
      console.info('[P2A header] plan still loading — opening workspace read-only');
      setShowP2AWorkspace(true);
      return;
    }
    if (!p2aPlanByProject) {
      if (oraApproved && canCreateVCR) {
        setShowP2APlanWizard(true);
      } else {
        // No plan yet + can't create — still open the workspace so the user
        // sees the empty state instead of a dead click.
        setShowP2AWorkspace(true);
      }
      return;
    }
    switch (planUIState.primaryAction) {
      case 'edit':
        setShowP2APlanWizard(true);
        break;
      case 'view':
        setShowP2AWorkspace(true);
        break;
      case 'create':
        if (canCreateVCR) setShowP2APlanWizard(true);
        else setShowP2AWorkspace(true);
        break;
      default:
        setShowP2AWorkspace(true);
    }
  };

  const handleP2AHeaderClick = () => {
    console.info('[P2A header] click', {
      hasPlan: !!p2aPlanByProject,
      loading: p2aPlanLoading,
      status: p2aPlanByProject?.status,
      action: planUIState.primaryAction,
    });
    openPlanByAction();
  };

  const handleP2AStatusClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!p2aPlanByProject) return;
    if (planIsLocked) {
      await loadP2ADraft();
      setShowP2ASubmission(true);
    } else {
      setShowP2AApprovals(true);
    }
  };

  const headerStatusLabel = hasPlan ? planUIState.badgeLabel : null;
  const headerStatusClass = hasPlan ? planUIState.badgeClass : '';

  // VCR narrative rollup — bold lead + exceptions, no % duplication.
  const vcrCounts = {
    total: allVCRs.length,
    completed: allVCRs.filter(v => v.lifecycle === 'handed_over').length,
    stalled: allVCRs.filter(v => {
      if (!v.updated_at) return false;
      const days = Math.floor((Date.now() - new Date(v.updated_at).getTime()) / 86400000);
      const lc = v.lifecycle ?? 'not_started';
      return days > 21 && lc !== 'handed_over' && lc !== 'approved';
    }).length,
    actionNeeded: allVCRs.filter(v => {
      const lc = v.lifecycle ?? 'not_started';
      return lc === 'not_started' || lc === 'draft';
    }).length,
  };
  const vcrNarrativeTone: 'ok' | 'attention' | 'critical' =
    vcrCounts.stalled > 0 ? 'critical' : vcrCounts.actionNeeded > 0 ? 'attention' : 'ok';
  const vcrNarrativeLead = vcrCounts.total === 0
    ? 'No VCRs yet'
    : vcrCounts.stalled > 0
      ? `${vcrCounts.stalled} VCR${vcrCounts.stalled === 1 ? '' : 's'} stalled`
      : vcrCounts.actionNeeded > 0
        ? `${vcrCounts.actionNeeded} awaiting setup`
        : vcrCounts.completed === vcrCounts.total
          ? 'All VCRs handed over'
          : 'On track';
  const vcrNarrativeSecondary = vcrCounts.total > 0
    ? `${vcrCounts.completed} of ${vcrCounts.total} handed over`
    : null;

  return (
    <>
      <Card className="h-full flex flex-col transition-all duration-300 group overflow-hidden glass-card glass-card-hover">
        <WidgetCardHeader
          Icon={Key}
          hoverIconClass="group-hover:text-orange-600"
          title="P2A Handover"
          onHeaderClick={handleP2AHeaderClick}
          dragProps={{ attributes: dragAttributes, listeners: dragListeners }}
        />
        <CardContent className="flex-1 flex flex-col space-y-3 pt-4 min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
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
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                <NarrativeSummary
                  tone={vcrNarrativeTone}
                  lead={vcrNarrativeLead}
                  secondary={vcrNarrativeSecondary}
                />
                <div className="space-y-3 overflow-y-auto overscroll-contain pr-1 flex-1 min-h-0 scrollbar-modern">
                  {vcrGroups.map(group => group.items.length === 0 ? null : (
                    <div key={group.key} className="space-y-2">
                      <InlineDivider label={group.label} count={group.items.length} />
                      {group.items.map(vcr => (
                        <VCRCard
                          key={vcr.id}
                          vcr={vcr}
                          onClick={handleVCRClick}
                          isActive={(wizardVCR?.id ?? selectedVCR?.id) === vcr.id}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : p2aPlanByProject ? (
              <div className="text-center py-8 text-muted-foreground">
                {planUIState.primaryAction === 'edit' ? (
                  <>
                    <p className="text-sm font-medium mb-1">Draft in Progress</p>
                    <p className="text-xs opacity-70 mb-4">{planUIState.helperText}</p>
                    {canCreateVCR && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 group/cta"
                          onClick={openPlanByAction}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground group-hover/cta:text-green-600 transition-colors" />
                          {planUIState.primaryLabel}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setShowDeleteP2ADraft(true); }}
                          aria-label="Delete draft P2A plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-3 w-full">
                      {headerStatusLabel && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={handleP2AStatusClick}
                          className="cursor-pointer"
                          title="View approvers"
                        >
                          <Badge variant="outline" className={cn("text-[10px] h-5 px-2 hover:opacity-80 transition-opacity", headerStatusClass)}>
                            {headerStatusLabel}
                          </Badge>
                        </button>
                      )}
                      <p className="text-xs text-muted-foreground max-w-xs text-center">
                        {planUIState.helperText}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-8 w-8 shrink-0" aria-hidden />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs gap-1.5"
                          onClick={openPlanByAction}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {planUIState.primaryLabel}
                        </Button>
                        <div className="h-8 w-8 shrink-0 flex items-center justify-center">
                          {canCreateVCR && planIsLocked && !planIsApproved && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); setShowDeleteP2ADraft(true); }}
                              aria-label="Delete submitted P2A plan"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>

                )}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm font-medium mb-1">No P2A Plan</p>
                <p className="text-xs opacity-70 mb-5">Set up your handover workflow with systems and VCRs</p>
                {canCreateVCR && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 group/cta"
                    onClick={() => setShowP2APlanWizard(true)}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground group-hover/cta:text-green-600 transition-colors" />
                    Develop P2A Plan
                  </Button>
                )}
              </div>
            )}
          </div>

          {showVCRList && canCreateVCR && (
            <div className="flex-shrink-0 mt-1">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setShowCreateVCR(true); }}
                className="group/cta w-full flex items-center justify-center gap-1.5 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors relative z-10"
                style={{
                  padding: '10px',
                  border: '0.5px dashed hsl(var(--border))',
                }}
              >
                <Plus className="h-3.5 w-3.5 transition-transform group-hover/cta:rotate-90 duration-200" />
                <span>Add VCR</span>
              </button>
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
        readOnly={planIsLocked}
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

      {/* P2A Approvals Dialog (opened by clicking the status badge) */}
      {p2aPlanByProject && (
        <Dialog open={showP2AApprovals} onOpenChange={setShowP2AApprovals}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>P2A Handover — Approvers</DialogTitle>
            </DialogHeader>
            <P2AApprovalsPanel planId={p2aPlanByProject.id} />
          </DialogContent>
        </Dialog>
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
          onOpenChange={(open) => {
            if (!open) {
              setSelectedVCR(null);
              setVcrInitialTab(undefined);
              // Clean URL params so navigating back doesn't re-open
              const next = new URLSearchParams(searchParams);
              next.delete('vcr');
              next.delete('tab');
              setSearchParams(next, { replace: true });
            }
          }}
          vcr={selectedVCR}
          projectName={projectName}
          projectCode={projectCode}
          initialTab={vcrInitialTab}
        />
      )}


      {wizardVCR && (
        <VCRExecutionPlanWizard
          open={!!wizardVCR}
          onOpenChange={(open) => { if (!open) setWizardVCR(null); }}
          vcr={wizardVCR}
          projectCode={projectCode}
        />
      )}

      {/* U8 routing — approver clicking an in_approval VCR opens review wizard */}
      <VCRPlanReviewLauncher
        payload={reviewPayload}
        open={!!reviewPayload}
        onOpenChange={(open) => { if (!open) setReviewPayload(null); }}
      />


      <AlertDialog open={showDeleteP2ADraft} onOpenChange={setShowDeleteP2ADraft}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {planIsLocked ? 'Delete submitted P2A Plan?' : 'Delete Draft P2A Plan?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {planIsLocked
                ? 'This will permanently delete the submitted P2A handover plan and cancel all pending approval tasks for its approvers. This action cannot be undone.'
                : 'This will permanently delete the draft P2A handover plan including all systems, VCRs, phases, and approvers. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingP2ADraft}
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await deleteP2ADraft();
                  setShowDeleteP2ADraft(false);
                  setShowP2ASubmission(false);
                } catch {
                  // toast handled in hook
                }
              }}
            >
              {isDeletingP2ADraft ? 'Deleting...' : 'Delete Plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {p2aPlanByProject && (
        <SubmissionSuccessDialog
          open={showP2ASubmission}
          onOpenChange={setShowP2ASubmission}
          planId={p2aPlanByProject.id}
          projectId={projectId}
          projectCode={projectCode}
          projectName={projectName}
          systems={p2aWizardState.systems}
          vcrs={p2aWizardState.vcrs}
          phases={p2aWizardState.phases}
          approvers={p2aWizardState.approvers}
          onDone={() => setShowP2ASubmission(false)}
          onOpenWorkspace={() => {
            setShowP2ASubmission(false);
            setShowP2AWorkspace(true);
          }}
        />
      )}

    </>
  );
};
