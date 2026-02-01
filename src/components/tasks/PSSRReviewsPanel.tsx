import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Shield, Wrench, AlertTriangle, Settings, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MyTasksPanelCard } from './MyTasksPanelCard';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { generateMockPSSRReviews, MockPSSRReview } from '@/hooks/useMyTasksMockData';
import { getAssetColor, getAssetAbbreviation, getUrgencyBackground, getUrgencyGlow } from '@/utils/assetColors';
import { cn } from '@/lib/utils';

interface PSSRReviewsPanelProps {
  userId: string;
  searchQuery?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isFullHeight?: boolean;
  isRelocated?: boolean;
}

// Helper function to get role icon
function getRoleIcon(role: string | undefined): React.ReactNode {
  if (!role) return <User className="h-3 w-3" />;
  
  const normalizedRole = role.toLowerCase();
  
  if (normalizedRole.includes('director')) {
    return <Shield className="h-3 w-3" />;
  }
  if (normalizedRole.includes('technical authority') || normalizedRole.includes('ta')) {
    return <Wrench className="h-3 w-3" />;
  }
  if (normalizedRole.includes('hse')) {
    return <AlertTriangle className="h-3 w-3" />;
  }
  if (normalizedRole.includes('operations')) {
    return <Settings className="h-3 w-3" />;
  }
  
  return <User className="h-3 w-3" />;
}

// Helper function to get item count styling
function getItemCountStyle(count: number): { containerClass: string; textClass: string } {
  if (count >= 10) {
    return {
      containerClass: 'bg-primary/10 px-1.5 py-0.5 rounded',
      textClass: 'text-primary font-medium',
    };
  }
  if (count >= 5) {
    return {
      containerClass: 'bg-muted/50 px-1.5 py-0.5 rounded',
      textClass: 'text-muted-foreground',
    };
  }
  return {
    containerClass: '',
    textClass: 'text-muted-foreground',
  };
}

export const PSSRReviewsPanel: React.FC<PSSRReviewsPanelProps> = ({ 
  userId, 
  searchQuery = '',
  isExpanded,
  onToggleExpand,
  isFullHeight = false,
  isRelocated = false,
}) => {
  const navigate = useNavigate();
  const { data: realPssrs, isLoading } = usePSSRsAwaitingReview(userId);
  const { isNewSinceLastLogin } = useUserLastLogin();

  // Use mock data if real data is empty
  const mockData = generateMockPSSRReviews();
  const pssrs = (realPssrs && realPssrs.length > 0) ? realPssrs : mockData;

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
      title="PSSR Reviews"
      icon={<ClipboardCheck className="h-5 w-5 text-white" />}
      iconColorClass="from-blue-500 to-blue-600"
      primaryStat={pendingPssrs.length}
      primaryLabel="pending"
      newCount={newCount}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isFullHeight={isFullHeight}
      isRelocated={isRelocated}
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
        const isMock = (item as MockPSSRReview).id?.startsWith('mock-');
        
        // Get asset-based styling
        const assetColors = getAssetColor(pssr?.asset);
        const assetAbbr = getAssetAbbreviation(pssr?.asset);
        const urgencyBg = getUrgencyBackground(daysPending);
        const urgencyGlow = getUrgencyGlow(daysPending);
        const itemCountStyle = getItemCountStyle(item.itemCount || 0);
        const roleIcon = getRoleIcon(item.approverRole);

        return (
          <div
            key={pssr?.id || item.pendingSince}
            className={cn(
              "p-3 rounded-lg border-l-[3px] border transition-all cursor-pointer group/item",
              "hover:shadow-sm hover:border-primary/20",
              // Asset-based left border
              assetColors.borderClass,
              // Urgency-based background
              urgencyBg,
              urgencyGlow,
              // New item indicator (overrides left border with primary)
              isNew && "border-l-primary",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => !isMock && navigate(`/pssr/${pssr?.id}/review`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {pssr?.pssr_id || 'Unknown PSSR'}
                  </span>
                  {isNew && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                      NEW
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {pssr?.project_name || 'Unknown Project'}
                  </p>
                  {assetAbbr && (
                    <span 
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded",
                        assetColors.badgeBgClass,
                        assetColors.badgeTextClass
                      )}
                    >
                      {assetAbbr}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn("text-xs flex items-center gap-1", itemCountStyle.containerClass)}>
                    <span className={itemCountStyle.textClass}>
                      {item.itemCount || 0} items
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {roleIcon}
                    <span className="truncate max-w-[120px]">
                      {item.approverRole || 'Reviewer'}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px]", getDaysPendingColor(daysPending))}
                >
                  {daysPending === 0 ? 'Today' : `${daysPending}d ago`}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isMock) navigate(`/pssr/${pssr?.id}/review`);
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
