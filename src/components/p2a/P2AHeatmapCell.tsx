import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface P2AHeatmapCellProps {
  handoverId: string;
  status: string;
  percentage?: number;
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

export const P2AHeatmapCell: React.FC<P2AHeatmapCellProps> = ({ handoverId, status, percentage }) => {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={() => navigate(`/p2a-handover/${handoverId}`)}
            className={`w-8 h-5 sm:w-10 sm:h-6 rounded cursor-pointer transition-all hover:scale-110 hover:shadow-md ${getStatusColor(status)}`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{getStatusLabel(status)}</p>
          {percentage !== undefined && <p className="text-xs">{percentage}% Complete</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};