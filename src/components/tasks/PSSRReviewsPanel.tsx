import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MyTasksPanelCard } from './MyTasksPanelCard';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { cn } from '@/lib/utils';

interface PSSRReviewsPanelProps {
  userId: string;
  searchQuery?: string;
}

export const PSSRReviewsPanel: React.FC<PSSRReviewsPanelProps> = ({ userId, searchQuery = '' }) => {
  const navigate = useNavigate();
  const { data: pssrs, isLoading } = usePSSRsAwaitingReview(userId);
  const { isNewSinceLastLogin } = useUserLastLogin();

  const pendingPssrs = (pssrs || []).filter(p => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.pssr?.pssr_id?.toLowerCase().includes(query) ||
      p.pssr?.project_name?.toLowerCase().includes(query)
    );
  });
  // Use pendingSince for "new" detection since that's when items were assigned
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
      isLoading={isLoading}
      isEmpty={pendingPssrs.length === 0}
      emptyMessage="No PSSR reviews pending"
      onViewAll={() => navigate('/pssr-reviews')}
    >
      {pendingPssrs.slice(0, 5).map((item) => {
        const isNew = isNewSinceLastLogin(item.pendingSince);
        const daysPending = Math.floor(
          (Date.now() - new Date(item.pendingSince).getTime()) / (1000 * 60 * 60 * 24)
        );
        const pssr = item.pssr;

        return (
          <div
            key={pssr?.id || item.pendingSince}
            className={cn(
              "p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-all cursor-pointer",
              isNew && "border-l-2 border-l-primary"
            )}
            onClick={() => navigate(`/pssr/${pssr?.id}/review`)}
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
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {pssr?.project_name || 'Unknown Project'}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-muted-foreground">
                    {item.itemCount || 0} items awaiting review
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
                  className="h-6 text-xs px-2"
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
