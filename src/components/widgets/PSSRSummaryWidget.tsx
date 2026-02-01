import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, FileText } from 'lucide-react';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { useProjectPSSRs } from '@/hooks/useProjectPSSRs';
import { PSSRQuickViewOverlay } from '@/components/pssr/PSSRQuickViewOverlay';
import { Skeleton } from '@/components/ui/skeleton';

interface PSSRSummaryWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
  onHide?: () => void;
}

export const PSSRSummaryWidget: React.FC<PSSRSummaryWidgetProps> = ({ 
  projectId, 
  dragAttributes, 
  dragListeners, 
  onHide 
}) => {
  const { data: pssrs, isLoading } = useProjectPSSRs(projectId);
  const [selectedPSSR, setSelectedPSSR] = useState<{ id: string; displayId: string } | null>(null);

  const handlePSSRClick = (pssrId: string, displayId: string) => {
    setSelectedPSSR({ id: pssrId, displayId });
  };

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
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 border rounded-lg bg-muted/30">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : pssrs && pssrs.length > 0 ? (
            <div className="space-y-3">
              {pssrs.map((pssr) => (
                <div 
                  key={pssr.id} 
                  className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group/item"
                  onClick={() => handlePSSRClick(pssr.id, pssr.pssr_id)}
                >
                  {/* PSSR ID as clickable link */}
                  <button
                    className="text-sm font-semibold text-primary hover:underline focus:outline-none text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePSSRClick(pssr.id, pssr.pssr_id);
                    }}
                  >
                    {pssr.pssr_id}
                  </button>
                  
                  {/* Brief description */}
                  {pssr.scope && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {pssr.scope}
                    </p>
                  )}
                  
                  {/* Progress bar instead of status badge */}
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={pssr.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium text-foreground min-w-[2.5rem] text-right">
                      {pssr.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No PSSRs found for this project</p>
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
    </>
  );
};
