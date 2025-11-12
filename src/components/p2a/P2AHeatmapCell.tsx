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
      return 'bg-slate-300 dark:bg-slate-700';
    case 'IN_PROGRESS':
      return 'bg-blue-400';
    case 'BEHIND_SCHEDULE':
      return 'bg-red-500';
    case 'COMPLETED':
      return 'bg-green-500';
    case 'NOT_APPLICABLE':
      return 'bg-gray-300 dark:bg-gray-600';
    default:
      return 'bg-slate-300';
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
            className={`w-16 h-8 rounded cursor-pointer transition-all hover:scale-105 hover:shadow-md ${getStatusColor(status)}`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{status.replace('_', ' ')}</p>
          {percentage !== undefined && <p className="text-xs">{percentage}% Complete</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};