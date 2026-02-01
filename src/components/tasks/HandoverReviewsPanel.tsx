import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MyTasksPanelCard } from './MyTasksPanelCard';
import { useUserP2AApprovals } from '@/hooks/useUserP2AApprovals';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';

import { cn } from '@/lib/utils';

interface HandoverReviewsPanelProps {
  searchQuery?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isFullHeight?: boolean;
  isRelocated?: boolean;
  isDimmed?: boolean;
}

export const HandoverReviewsPanel: React.FC<HandoverReviewsPanelProps> = ({ 
  searchQuery = '',
  isExpanded,
  onToggleExpand,
  isFullHeight = false,
  isRelocated = false,
  isDimmed = false,
}) => {
  const navigate = useNavigate();
  const { approvals: realApprovals, stats, isLoading } = useUserP2AApprovals();
  const { isNewSinceLastLogin } = useUserLastLogin();

  // Use real data, fallback to mock for demo
  const mockApprovals = [
    {
      id: 'mock-1',
      handover_id: 'mock-h1',
      handover_name: 'System A - Electrical Distribution',
      project_number: 'DP-300',
      stage: 'PAC',
      approver_name: 'Technical Authority',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-2',
      handover_id: 'mock-h2',
      handover_name: 'Fire & Gas Detection System',
      project_number: 'KG-150',
      stage: 'FAC',
      approver_name: 'Operations Lead',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-3',
      handover_id: 'mock-h3',
      handover_name: 'Process Control System',
      project_number: 'TN-200',
      stage: 'PAC',
      approver_name: 'Safety Engineer',
      created_at: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
  
  const rawApprovals = realApprovals?.length ? realApprovals : mockApprovals;

  const approvals = rawApprovals.filter(a => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.handover_name?.toLowerCase().includes(query) ||
      a.project_number?.toLowerCase().includes(query)
    );
  });

  const newCount = approvals.filter(a => isNewSinceLastLogin(a.created_at)).length;

  // Calculate stats from actual data being displayed
  const displayStats = {
    total: approvals.length,
    pac: approvals.filter(a => a.stage === 'PAC').length,
    fac: approvals.filter(a => a.stage === 'FAC').length,
  };

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
      title="Handover Reviews"
      icon={<RefreshCw className="h-5 w-5 text-white" />}
      iconColorClass="from-teal-500 to-teal-600"
      primaryStat={displayStats.total}
      primaryLabel="pending"
      secondaryStat={displayStats.pac}
      secondaryLabel="PAC"
      newCount={newCount}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isFullHeight={isFullHeight}
      isRelocated={isRelocated}
      isDimmed={isDimmed}
      isLoading={isLoading}
      isEmpty={approvals.length === 0}
      emptyMessage="No handover reviews pending"
      onViewAll={() => navigate('/p2a-handover')}
    >
      {approvals.map((approval, index) => {
        const isNew = isNewSinceLastLogin(approval.created_at);

        return (
          <div
            key={approval.id}
            className={cn(
              "p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-all cursor-pointer group/item",
              "hover:shadow-sm hover:border-primary/20",
              isNew && "border-l-2 border-l-primary",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
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
                  className="h-6 text-xs px-2 opacity-0 group-hover/item:opacity-100 transition-opacity"
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
