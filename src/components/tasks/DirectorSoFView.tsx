import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, LogOut, ExternalLink, AlertCircle, Clock, FileCheck, FileText } from 'lucide-react';
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

// Mock approvers for the overlay
const getMockApproversForOverlay = () => [
  {
    id: 'approver-1',
    approver_name: 'Ali Danbous',
    approver_role: 'HSSE Director',
    approver_level: 1,
    status: 'APPROVED',
    comments: 'All safety requirements have been verified. Ready for facility startup.',
    approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    signature_data: undefined, // Will use SVG signature in certificate
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

export const DirectorSoFView: React.FC<DirectorSoFViewProps> = ({ userName }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: sofItems, isLoading, error } = useSOFAwaitingDirectorReview();
  
  // State for overlay
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [selectedPssrId, setSelectedPssrId] = useState<string | null>(null);

  const pendingItems = sofItems?.filter(item => item.status === 'PENDING') || [];
  const lockedItems = sofItems?.filter(item => item.status === 'LOCKED') || [];
  const allDone = !isLoading && pendingItems.length === 0;

  const firstName = userName?.split(' ')[0] || 'there';

  const handleViewSoF = (pssrId: string) => {
    // Open the overlay instead of navigating
    setSelectedPssrId(pssrId);
    setOverlayOpen(true);
  };

  const handleExit = async () => {
    await signOut();
    navigate('/');
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

  // All done state - show success message
  if (allDone && lockedItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background to-muted/20">
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
        {/* Header */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            {pendingItems.length} {pendingItems.length === 1 ? 'SoF awaiting' : 'SoFs awaiting'} your approval
          </p>
        </div>

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

        {/* Recent Activity Section */}
        <div className="mt-10 pt-6 border-t border-border/40">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {/* Mock recent activities - would be replaced with real data */}
            <div className="flex items-start gap-3 text-sm">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <FileCheck className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground">
                  Signed SoF for <span className="font-medium">CS6 Produced Water</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <FileCheck className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground">
                  Signed SoF for <span className="font-medium">MJ North Manifold</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground">
                  Reviewed VCR for <span className="font-medium">RM Degassing Station</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), { addSuffix: true })}
                </p>
              </div>
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
          certificateNumber="SOF-2026-0042"
          pssrReason="Start-up of a New Project or Facility"
          plantName="CS"
          facilityName="Hammar Mishrif"
          projectName="DP-300 HM Additional Compressors"
          approvers={getMockApproversForOverlay()}
          status="PENDING_SIGNATURE"
        />
      )}
    </div>
  );
};
