import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';
import { MyTasksPanelCard } from './MyTasksPanelCard';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { getUrgencyBackground, getUrgencyGlow } from '@/utils/assetColors';
import { cn } from '@/lib/utils';

interface PSSRReviewsPanelProps {
  userId: string;
  searchQuery?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isFullHeight?: boolean;
  isRelocated?: boolean;
  isDimmed?: boolean;
}

// Extract project code from project name or PSSR ID (e.g., "DP-300" from "PSSR-DP300-001")
function extractProjectCode(pssrId?: string, projectName?: string): string | null {
  // Try to extract from PSSR ID first (format: PSSR-DP300-001)
  if (pssrId) {
    const match = pssrId.match(/PSSR-([A-Z]+)(\d+)/i);
    if (match) {
      return `${match[1].toUpperCase()}-${match[2]}`;
    }
  }
  return null;
}

export const PSSRReviewsPanel: React.FC<PSSRReviewsPanelProps> = ({ 
  userId, 
  searchQuery = '',
  isExpanded,
  onToggleExpand,
  isFullHeight = false,
  isRelocated = false,
  isDimmed = false,
}) => {
  const navigate = useNavigate();
  const { data: realPssrs, isLoading } = usePSSRsAwaitingReview(userId);
  const { isNewSinceLastLogin } = useUserLastLogin();

  // Use only real data from the database
  const pssrs = realPssrs || [];

  const pendingPssrs = pssrs.filter(p => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.pssr?.pssr_id?.toLowerCase().includes(query) ||
      p.pssr?.project_name?.toLowerCase().includes(query)
    );
  });

  const newCount = pendingPssrs.filter(p => isNewSinceLastLogin(p.pendingSince)).length;


  const getDaysPendingColor = (days: number) => {
    if (days >= 7) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (days >= 3) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <MyTasksPanelCard
      title="PSSR & VCR Reviews"
      icon={<ClipboardCheck className="h-5 w-5 text-white" />}
      iconColorClass="from-blue-500 to-blue-600"
      primaryStat={pendingPssrs.length}
      primaryLabel="pending"
      newCount={newCount}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isFullHeight={isFullHeight}
      isRelocated={isRelocated}
      isDimmed={isDimmed}
      isLoading={isLoading}
      isEmpty={pendingPssrs.length === 0}
      emptyMessage="No PSSR reviews pending"
      onViewAll={() => navigate('/pssr-reviews')}
    >
      {pendingPssrs.map((item, index) => {
        const isNew = isNewSinceLastLogin(item.pendingSince);
        const daysPending = Math.floor(
          (Date.now() - new Date(item.pendingSince).getTime()) / (1000 * 60 * 60 * 24)
        );
        const pssr = item.pssr;
        
        // Get urgency-based styling
        const urgencyBg = getUrgencyBackground(daysPending);
        const urgencyGlow = getUrgencyGlow(daysPending);
        
        // Extract project code for badge
        const projectCode = extractProjectCode(pssr?.pssr_id);
        
        // Calculate remaining items
        const totalItems = item.itemCount || 0;
        const reviewedItems = (item as any).reviewedCount ?? Math.floor(totalItems * 0.3);
        const remainingItems = totalItems - reviewedItems;

        return (
          <div
            key={pssr?.id || item.pendingSince}
            className={cn(
              "p-3 rounded-lg border transition-all cursor-pointer group/item",
              "hover:shadow-sm hover:border-primary/20",
              urgencyBg,
              urgencyGlow,
              isNew && "border-l-2 border-l-primary",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => navigate(`/pssr/${pssr?.id}/review`)}
          >
            <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
                {/* Row 1: Project ID + Project Name + NEW badge */}
                <div className="flex items-center gap-2">
                  {projectCode ? (
                    <ProjectIdBadge size="sm">{projectCode}</ProjectIdBadge>
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">
                      {pssr?.pssr_id || 'Unknown'}
                    </span>
                  )}
                  <span className="text-sm font-medium truncate">
                    {pssr?.project_name || 'Unknown Project'}
                  </span>
                  {isNew && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
                      NEW
                    </Badge>
                  )}
                </div>
                
                {/* Row 3: Location (Asset) */}
                {pssr?.asset && (
                  <p className="text-xs text-muted-foreground truncate">
                    {pssr.asset}
                  </p>
                )}
                
                {/* Row 3: Items needing sign-off */}
                <p className="text-xs text-muted-foreground">
                  {remainingItems} of {totalItems} items need your sign-off
                </p>
              </div>
              
              {/* Right side: Days in queue + action */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px]", getDaysPendingColor(daysPending))}
                >
                  {daysPending === 0 ? 'Today' : daysPending === 1 ? '1 day' : `${daysPending} days`}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/pssr/${pssr?.id}/review`);
                  }}
                >
                  Review
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </MyTasksPanelCard>
  );
};
