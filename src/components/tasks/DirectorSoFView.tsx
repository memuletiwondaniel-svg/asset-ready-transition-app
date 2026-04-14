import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, LogOut, ExternalLink, AlertCircle, Clock, FileCheck, FileText, XCircle, AlertTriangle, Eye, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useSOFAwaitingDirectorReview } from '@/hooks/useSOFAwaitingDirectorReview';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';
import { formatDistanceToNow } from 'date-fns';
import { SOFReviewOverlay } from '@/components/sof/SOFReviewOverlay';

interface DirectorSoFViewProps {
  userName?: string;
}

// Storage key for rejection activity (matches SOFCertificate.tsx)
const SOF_REJECTION_ACTIVITY_KEY = 'sof-rejection-activity';

interface RejectionActivity {
  type: 'approved' | 'rejected';
  approver: string;
  priorityLevel?: 'Pr1';
  description?: string;
  linkedItemId?: string;
  timestamp: string;
  comments?: string;
  pssrId?: string;
  projectName?: string;
}

// Mock approvers for the overlay - returns different states based on activity
const getMockApproversForOverlay = (activity?: RejectionActivity | null) => {
  const aliSignature = typeof window !== 'undefined' ? localStorage.getItem('ali-danbous-signature') : null;
  
  // Base state: Ali approved, Paul pending, Marije locked
  const baseApprovers = [
    {
      id: 'approver-1',
      approver_name: 'Ali Danbous',
      approver_role: 'HSSE Director',
      approver_level: 1,
      status: 'APPROVED',
      comments: 'All safety requirements have been verified. Ready for facility startup.',
      approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      signature_data: aliSignature || undefined,
    },
    {
      id: 'approver-2',
      approver_name: 'Paul Van Den Hemel',
      approver_role: 'P&M Director',
      approver_level: 2,
      status: 'PENDING',
      comments: undefined,
      approved_at: undefined,
      signature_data: undefined,
      rejected_at: undefined,
      rejection_priority: undefined as 'Pr1' | undefined,
      rejection_description: undefined as string | undefined,
    },
    {
      id: 'approver-3',
      approver_name: 'Marije Hoedemaker',
      approver_role: 'P&E Director',
      approver_level: 3,
      status: 'LOCKED',
      comments: undefined,
      approved_at: undefined,
      signature_data: undefined,
    },
  ];

  // If viewing history, update Paul's status based on activity
  if (activity) {
    if (activity.type === 'rejected') {
      baseApprovers[1] = {
        ...baseApprovers[1],
        status: 'REJECTED_PR1',
        rejected_at: activity.timestamp,
        rejection_priority: 'Pr1',
        rejection_description: activity.description,
      };
    } else if (activity.type === 'approved') {
      // Get Paul's saved signature if available
      const paulSignature = typeof window !== 'undefined' ? localStorage.getItem('paul-vandenhemel-signature') : null;
      baseApprovers[1] = {
        ...baseApprovers[1],
        status: 'APPROVED',
        comments: activity.comments || 'Approved',
        approved_at: activity.timestamp,
        signature_data: paulSignature || undefined,
      };
      // Unlock Marije
      baseApprovers[2] = {
        ...baseApprovers[2],
        status: 'PENDING',
      };
    }
  }

  return baseApprovers;
};

// Completed approvers for DP-385 historical view
const getDP385Approvers = () => {
  return [
    {
      id: 'approver-1',
      approver_name: 'Ali Danbous',
      approver_role: 'HSSE Director',
      approver_level: 1,
      status: 'APPROVED',
      comments: 'All safety and environmental requirements verified. Facility ready for gas feed operations.',
      approved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      signature_data: typeof window !== 'undefined' ? localStorage.getItem('ali-danbous-signature') : undefined,
    },
    {
      id: 'approver-2',
      approver_name: 'Paul Van Den Hemel',
      approver_role: 'P&M Director',
      approver_level: 2,
      status: 'APPROVED',
      comments: 'Production and maintenance systems reviewed and approved.',
      approved_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      signature_data: typeof window !== 'undefined' ? localStorage.getItem('paul-vandenhemel-signature') : undefined,
    },
    {
      id: 'approver-3',
      approver_name: 'Marije Hoedemaker',
      approver_role: 'P&E Director',
      approver_level: 3,
      status: 'APPROVED',
      comments: 'Project engineering deliverables complete. Approved for startup.',
      approved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      signature_data: typeof window !== 'undefined' ? localStorage.getItem('marije-hoedemaker-signature') : undefined,
    },
  ];
};

export const DirectorSoFView: React.FC<DirectorSoFViewProps> = ({ userName }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: sofItems, isLoading, error } = useSOFAwaitingDirectorReview();
  
  // State for overlay
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [selectedPssrId, setSelectedPssrId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  
  // State for rejection activity (read from localStorage)
  const [recentActivity, setRecentActivity] = useState<RejectionActivity | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Read rejection activity from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SOF_REJECTION_ACTIVITY_KEY);
    if (stored) {
      try {
        setRecentActivity(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse rejection activity', e);
      }
    }
  }, [overlayOpen]); // Re-read when overlay closes

  // Filter out pending items if Pr1 rejection exists (pauses at Paul's stage)
  const hasPr1Rejection = recentActivity?.type === 'rejected' && recentActivity?.priorityLevel === 'Pr1';
  // Also hide from pending if just approved
  const hasRecentApproval = recentActivity?.type === 'approved';

  const pendingItems = sofItems?.filter(item => {
    // If there's a Pr1 rejection or approval, hide the pending SoF from the list
    if (hasPr1Rejection || hasRecentApproval) return false;
    return item.status === 'PENDING';
  }) || [];
  const lockedItems = sofItems?.filter(item => item.status === 'LOCKED') || [];
  // "All done" means no pending items at all (regardless of recent activity)
  const noPendingTasks = !isLoading && pendingItems.length === 0;
  // Show the empty state only if truly nothing to show (no pending, no locked, no recent activity)
  const showEmptyState = noPendingTasks && lockedItems.length === 0 && !recentActivity;

  const firstName = userName?.split(' ')[0] || 'there';

  const handleViewSoF = (pssrId: string, viewOnly: boolean = false) => {
    // Open the overlay
    setSelectedPssrId(pssrId);
    setIsViewOnly(viewOnly);
    setOverlayOpen(true);
  };

  const handleExit = async () => {
    await signOut();
    // Clear caches and hard reload for fresh bundle
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-8 w-64 mx-auto mb-2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl border-destructive/50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Failed to load your tasks. Please try again.</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state - show only if absolutely nothing (no pending, no locked, no history)
  if (showEmptyState) {
    return (
      <div className="flex items-center justify-center p-6 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-lg text-center border-green-500/30 bg-green-50/5">
          <CardContent className="pt-10 pb-8">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              All done, {firstName}!
            </h1>
            <p className="text-muted-foreground mb-8">
              You have no pending Statement of Fitness reviews at this time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Go to Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={handleExit}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl mx-auto">
        {/* "All caught up" banner when no pending items but has recent activity */}
        {noPendingTasks && recentActivity && (
          <div className="mb-8 relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-50/80 to-purple-50/40 dark:from-violet-950/20 dark:to-purple-950/10 border border-violet-200/50 dark:border-violet-800/30">
            {/* Subtle decorative accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-violet-200/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />
            
            <div className="relative px-6 py-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Text content - now the hero */}
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-bold text-foreground">
                    You're all caught up, <span className="font-extrabold">{firstName}</span>! 🎉
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    No pending Statement of Fitness reviews at this time.
                  </p>
                </div>
                
                {/* Actions */}
                <div className="shrink-0">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleExit}
                    className="gap-2 border-violet-300 hover:bg-violet-100 hover:border-violet-400 dark:border-violet-700 dark:hover:bg-violet-900/30"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header - only show if there are pending items */}
        {pendingItems.length > 0 && (
          <div className="mb-6">
            <p className="text-muted-foreground">
              {`${pendingItems.length} ${pendingItems.length === 1 ? 'SoF awaiting' : 'SoFs awaiting'} your approval`}
            </p>
          </div>
        )}

        {/* Pending SoF Items */}
        <div className="space-y-4">
        {pendingItems.map((item, index) => {
          // Extract project code from PSSR ID (e.g., "PSSR-DP300-001" -> "DP300")
          const pssrIdParts = item.pssr?.pssr_id?.replace('PSSR-', '').split('-') || ['DP217'];
          const projectCode = pssrIdParts[0] || 'DP217'; // First part is the project code
          // Display with hyphen for readability (DP-217), use raw for color (DP217)
          const displayId = projectCode.match(/^([A-Z]+)(\d+)$/) 
            ? `${projectCode.match(/^([A-Z]+)(\d+)$/)?.[1]}-${projectCode.match(/^([A-Z]+)(\d+)$/)?.[2]}`
            : projectCode;
          const projectName = item.pssr?.project_name || 'HM Additional Compressors';
          
          return (
            <Card
              key={item.id}
              className={cn(
                "transition-all hover:shadow-md hover:border-primary/30 cursor-pointer group",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleViewSoF(item.pssr_id)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <ProjectIdBadge projectId={projectCode}>
                        {displayId}
                      </ProjectIdBadge>
                      <h3 className="font-semibold text-base truncate">
                        {projectName}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        SoF
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                        Pending
                      </Badge>
                    </div>
                    {item.pssr?.asset && (
                      <p className="text-sm text-muted-foreground truncate">
                        {item.pssr.asset}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Signing as: <span className="font-medium">{item.approver_role}</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewSoF(item.pssr_id);
                    }}
                  >
                    Review & Sign
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

          {/* Locked items - still waiting for other approvers */}
          {lockedItems.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-sm text-muted-foreground">
                  Awaiting other approvers ({lockedItems.length})
                </p>
              </div>
              {lockedItems.map((item) => {
                // Extract project code from PSSR ID (e.g., "PSSR-DP300-001" -> "DP300")
                const pssrIdParts = item.pssr?.pssr_id?.replace('PSSR-', '').split('-') || ['DP217'];
                const projectCode = pssrIdParts[0] || 'DP217';
                const displayId = projectCode.match(/^([A-Z]+)(\d+)$/) 
                  ? `${projectCode.match(/^([A-Z]+)(\d+)$/)?.[1]}-${projectCode.match(/^([A-Z]+)(\d+)$/)?.[2]}`
                  : projectCode;
                const projectName = item.pssr?.project_name || 'HM Additional Compressors';
                
                return (
                  <Card
                    key={item.id}
                    className="opacity-60 bg-muted/30"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <ProjectIdBadge projectId={projectCode}>
                              {displayId}
                            </ProjectIdBadge>
                            <h3 className="font-medium text-base truncate">
                              {projectName}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              SoF
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Awaiting Prerequisites
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Waiting for PSSR/VCR approvals to complete
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>

        {/* Recent Activity Section - always visible */}
        <div className="mt-8 pt-5 border-t border-border/30">
          <h3 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Recent Activity
          </h3>
          <div className="space-y-0.5">
            {/* Dynamic activity from recent rejection/approval */}
            {recentActivity && (
              <div 
                className="flex items-center gap-2 text-sm py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/30 cursor-pointer transition-colors group"
                onClick={() => handleViewSoF('mock-pssr-id', true)}
              >
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0 opacity-60 group-hover:opacity-100 transition-opacity",
                  recentActivity.type === 'approved' 
                    ? "bg-green-500/10 group-hover:bg-green-500/20" 
                    : recentActivity.priorityLevel === 'Pr1'
                    ? "bg-red-500/10 group-hover:bg-red-500/20"
                    : "bg-amber-500/10 group-hover:bg-amber-500/20"
                )}>
                  {recentActivity.type === 'approved' ? (
                    <FileCheck className="h-3 w-3 text-green-600" />
                  ) : recentActivity.priorityLevel === 'Pr1' ? (
                    <XCircle className="h-3 w-3 text-red-600" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-block max-w-full">
                    <p className="text-muted-foreground group-hover:text-foreground text-sm leading-snug transition-colors">
                      {recentActivity.type === 'approved' ? (
                        <>
                          Signed SoF for <span className="font-mono">DP-300:</span>{' '}
                          <span className="font-medium text-foreground/80 group-hover:text-foreground transition-colors">{recentActivity.projectName || 'HM Additional Compressors'}</span>
                        </>
                      ) : (
                        <>
                          Rejected SoF for <span className="font-mono">DP-300:</span>{' '}
                          <span className="font-medium text-foreground/80 group-hover:text-foreground transition-colors">{recentActivity.projectName || 'HM Additional Compressors'}</span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "ml-2 text-xs opacity-70 group-hover:opacity-100 transition-opacity",
                              recentActivity.priorityLevel === 'Pr1' 
                                ? "border-red-300 text-red-700" 
                                : "border-amber-300 text-amber-700"
                            )}
                          >
                            {recentActivity.priorityLevel}
                          </Badge>
                        </>
                      )}
                    </p>
                    {recentActivity.type === 'rejected' && recentActivity.description && (
                      <div className="mt-0.5">
                        <div className="flex items-baseline gap-1">
                          <p className={cn(
                            "text-xs text-muted-foreground/70 min-w-0",
                            !isDescriptionExpanded ? "truncate flex-1" : ""
                          )}>
                            {recentActivity.description}
                          </p>
                          {recentActivity.description.length > 30 && !isDescriptionExpanded && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsDescriptionExpanded(true);
                              }}
                              className="text-xs text-primary/70 hover:underline shrink-0"
                            >
                              more
                            </button>
                          )}
                        </div>
                        {isDescriptionExpanded && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDescriptionExpanded(false);
                            }}
                            className="text-xs text-primary/70 hover:underline mt-0.5"
                          >
                            less
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                    {formatDistanceToNow(new Date(recentActivity.timestamp), { addSuffix: true }).replace('about ', '')}
                  </p>
                </div>
                <Eye className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}

            {/* Static mock activities */}
            <div 
              className="flex items-center gap-2 text-sm py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/30 cursor-pointer transition-colors group"
              onClick={() => handleViewSoF('mock-pssr-dp385', true)}
            >
              <div className="h-5 w-5 rounded-full bg-green-500/10 group-hover:bg-green-500/20 flex items-center justify-center shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <FileCheck className="h-3 w-3 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground group-hover:text-foreground text-sm leading-snug transition-colors">
                  Signed SoF for <span className="font-mono">DP-385:</span>{' '}
                  <span className="font-medium text-foreground/80 group-hover:text-foreground transition-colors">OT2/3 Gas Feed to CS6/7</span>
                </p>
                <p className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                  {formatDistanceToNow(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), { addSuffix: true }).replace('about ', '')}
                </p>
              </div>
              <Eye className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div 
              className="flex items-center gap-2 text-sm py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/30 cursor-pointer transition-colors group"
              onClick={() => handleViewSoF('mock-pssr-dp40', true)}
            >
              <div className="h-5 w-5 rounded-full bg-green-500/10 group-hover:bg-green-500/20 flex items-center justify-center shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <FileCheck className="h-3 w-3 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground group-hover:text-foreground text-sm leading-snug transition-colors">
                  Signed SoF for <span className="font-mono">DP-40:</span>{' '}
                  <span className="font-medium text-foreground/80 group-hover:text-foreground transition-colors">HM LLP Gas Capture</span>
                </p>
                <p className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                  {formatDistanceToNow(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), { addSuffix: true }).replace('about ', '')}
                </p>
              </div>
              <Eye className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center gap-2 text-sm py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/30 cursor-pointer transition-colors group">
              <div className="h-5 w-5 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <FileText className="h-3 w-3 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground group-hover:text-foreground text-sm leading-snug transition-colors">
                  Reviewed <span className="font-medium text-foreground/80 group-hover:text-foreground transition-colors">BGC P2A Heatmap</span>
                </p>
                <p className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                  {formatDistanceToNow(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), { addSuffix: true }).replace('about ', '')}
                </p>
              </div>
              <Eye className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

      </div>

      {/* SoF Review Overlay */}
      {selectedPssrId && (
        <SOFReviewOverlay
          open={overlayOpen}
          onOpenChange={setOverlayOpen}
          pssrId={selectedPssrId}
          certificateNumber={selectedPssrId === 'mock-pssr-dp385' ? 'SOF-2025-0127' : 'SOF-2026-0042'}
          pssrReason="Start-up of a New Project or Facility"
          plantName="CS"
          facilityName={selectedPssrId === 'mock-pssr-dp385' ? 'CS6 and CS7' : 'Hammar Mishrif'}
          projectName={selectedPssrId === 'mock-pssr-dp385' ? 'DP-385: OT2/3 Gas Feed to CS6/7' : 'DP-300 HM Additional Compressors'}
          approvers={selectedPssrId === 'mock-pssr-dp385' ? getDP385Approvers() : getMockApproversForOverlay(isViewOnly ? recentActivity : null)}
          status={selectedPssrId === 'mock-pssr-dp385' ? 'COMPLETED' : (isViewOnly ? 'COMPLETED' : 'PENDING_SIGNATURE')}
          isViewOnly={selectedPssrId === 'mock-pssr-dp385' ? true : isViewOnly}
        />
      )}
    </div>
  );
};
