import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, FileText, Plus, ChevronRight } from 'lucide-react';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { useProjectPSSRs } from '@/hooks/useProjectPSSRs';
import { useProjectVCRs } from '@/hooks/useProjectVCRs';
import { PSSRQuickViewOverlay } from '@/components/pssr/PSSRQuickViewOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateVCRWizard } from './vcr-wizard/CreateVCRWizard';
import { cn } from '@/lib/utils';

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
  const [selectedPSSR, setSelectedPSSR] = useState<{ id: string; displayId: string } | null>(null);
  const [showCreateVCR, setShowCreateVCR] = useState(false);

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
      <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-red-500/20 group">
        <CardHeader {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StyledWidgetIcon 
                Icon={AlertTriangle}
                gradientFrom="from-red-500"
                gradientTo="to-orange-500"
                glowFrom="from-red-500/40"
                glowTo="to-orange-500/40"
              />
              <span>VCRs and PSSRs</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateVCR(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create VCR
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 border rounded-lg bg-muted/30">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : hasContent ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {/* VCRs Section */}
              {allVCRs.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    VCRs ({allVCRs.length})
                  </div>
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
                        </div>
                        <div className="text-sm font-medium truncate">{vcr.name}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </>
              )}

              {/* PSSRs Section */}
              {pssrs && pssrs.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mt-3">
                    PSSRs ({pssrs.length})
                  </div>
                  {pssrs.map((pssr) => (
                    <div 
                      key={pssr.id} 
                      className="flex items-center gap-3 p-2.5 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors cursor-pointer group/item"
                      onClick={() => handlePSSRClick(pssr.id, pssr.pssr_id)}
                    >
                      <CircularProgress value={pssr.progress || 0} className="text-amber-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-amber-600/70">{pssr.pssr_id}</span>
                        </div>
                        <div className="text-sm font-medium truncate">
                          {pssr.scope || pssr.reason || 'PSSR'}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No VCRs or PSSRs found</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowCreateVCR(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create VCR
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
    </>
  );
};
