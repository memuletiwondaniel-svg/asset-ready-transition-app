import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { HeatmapCellClickData } from './P2AHeatmapCellDialog';

interface P2AHeatmapCellProps {
  handoverId: string;
  categoryId: string;
  status: string;
  percentage: number;
  categoryName?: string;
  latestComment?: string;
  lastUpdated?: string;
  deliverableCount?: number;
  completedCount?: number;
  onCellClick?: (data: HeatmapCellClickData) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return 'bg-white border border-muted-foreground/30 dark:bg-slate-800 dark:border-slate-600';
    case 'IN_PROGRESS':
      return 'bg-amber-400';
    case 'BEHIND_SCHEDULE':
    case 'OVERDUE':
      return 'bg-red-500';
    case 'COMPLETED':
      return 'bg-green-500';
    case 'NOT_APPLICABLE':
      return 'bg-gray-400 dark:bg-gray-600';
    default:
      return 'bg-white border border-muted-foreground/30';
  }
};

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'COMPLETED':
      return 'default';
    case 'BEHIND_SCHEDULE':
    case 'OVERDUE':
      return 'destructive';
    case 'IN_PROGRESS':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return 'Not Started';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'BEHIND_SCHEDULE':
    case 'OVERDUE':
      return 'Overdue';
    case 'COMPLETED':
      return 'Completed';
    case 'NOT_APPLICABLE':
      return 'N/A';
    default:
      return status.replace(/_/g, ' ');
  }
};

const getTextColor = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return 'text-muted-foreground';
    case 'IN_PROGRESS':
      return 'text-amber-900';
    case 'NOT_APPLICABLE':
      return 'text-gray-100';
    default:
      return 'text-white';
  }
};

const shouldShowPercentage = (status: string) => {
  return status !== 'NOT_STARTED' && status !== 'NOT_APPLICABLE';
};

export const P2AHeatmapCell: React.FC<P2AHeatmapCellProps> = ({ 
  handoverId,
  categoryId,
  status, 
  percentage,
  categoryName,
  latestComment,
  lastUpdated,
  deliverableCount = 0,
  completedCount = 0,
  onCellClick
}) => {
  const truncateComment = (comment: string, maxLength: number = 80) => {
    if (comment.length <= maxLength) return comment;
    return comment.substring(0, maxLength) + '...';
  };

  const handleClick = () => {
    onCellClick?.({
      handoverId,
      categoryId,
      categoryName,
      status,
      percentage,
      deliverableCount,
      completedCount,
      latestComment,
      lastUpdated
    });
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            onClick={handleClick}
            className={`w-8 h-5 sm:w-10 sm:h-6 rounded cursor-pointer transition-all hover:scale-110 hover:shadow-md flex items-center justify-center ${getStatusColor(status)}`}
          >
            {shouldShowPercentage(status) && (
              <span className={`text-[7px] sm:text-[8px] font-bold ${getTextColor(status)}`}>
                {percentage}%
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-0" side="top">
          <div className="p-3 space-y-2">
            {/* Status Badge */}
            <div className="flex items-center justify-between gap-2">
              <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
                {getStatusLabel(status)}
              </Badge>
              {deliverableCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedCount}/{deliverableCount} items
                </span>
              )}
            </div>

            {/* Category Name */}
            {categoryName && (
              <p className="text-sm font-medium">{categoryName}</p>
            )}

            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs font-medium">{percentage}%</span>
            </div>

            {/* Latest Comment */}
            {latestComment && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Latest Comment</p>
                <p className="text-xs italic text-foreground/80">"{truncateComment(latestComment)}"</p>
              </div>
            )}

            {/* Last Updated */}
            {lastUpdated && (
              <p className="text-[10px] text-muted-foreground">
                Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};