import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MyTasksPanelCard } from './MyTasksPanelCard';
import { useUserP2AApprovals } from '@/hooks/useUserP2AApprovals';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { cn } from '@/lib/utils';

export const HandoverReviewsPanel: React.FC = () => {
  const navigate = useNavigate();
  const { approvals, stats, isLoading } = useUserP2AApprovals();
  const { isNewSinceLastLogin } = useUserLastLogin();

  const newCount = approvals.filter(a => isNewSinceLastLogin(a.created_at)).length;

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'PAC':
        return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
      case 'FAC':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <MyTasksPanelCard
      title="P2A Handover Reviews"
      icon={<RefreshCw className="h-5 w-5 text-white" />}
      iconColorClass="from-teal-500 to-teal-600"
      primaryStat={stats.total}
      primaryLabel="pending"
      secondaryStat={stats.pac}
      secondaryLabel="PAC"
      newCount={newCount}
      isLoading={isLoading}
      isEmpty={approvals.length === 0}
      emptyMessage="No handover reviews pending"
      onViewAll={() => navigate('/p2a-handover')}
    >
      {approvals.slice(0, 5).map((approval) => {
        const isNew = isNewSinceLastLogin(approval.created_at);

        return (
          <div
            key={approval.id}
            className={cn(
              "p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-all cursor-pointer",
              isNew && "border-l-2 border-l-primary"
            )}
            onClick={() => navigate(`/p2a-handover/${approval.handover_id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {approval.handover_name}
                  </span>
                  {isNew && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                      NEW
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {approval.project_number || 'Unknown Project'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Approval as: {approval.approver_name}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px]", getStageColor(approval.stage))}
                >
                  {approval.stage}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/p2a-handover/${approval.handover_id}`);
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
