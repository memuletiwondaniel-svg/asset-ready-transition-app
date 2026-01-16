import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Circle,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

export interface HeatmapCellClickData {
  handoverId: string;
  categoryId: string;
  categoryName?: string;
  status: string;
  percentage: number;
  deliverableCount?: number;
  completedCount?: number;
  latestComment?: string;
  lastUpdated?: string;
}

interface P2AHeatmapCellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cellData: HeatmapCellClickData | null;
}

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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'IN_PROGRESS':
      return <Clock className="h-5 w-5 text-amber-500" />;
    case 'BEHIND_SCHEDULE':
    case 'OVERDUE':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
};

export const P2AHeatmapCellDialog: React.FC<P2AHeatmapCellDialogProps> = ({
  open,
  onOpenChange,
  cellData
}) => {
  const navigate = useNavigate();

  if (!cellData) return null;

  const {
    handoverId,
    categoryName,
    status,
    percentage,
    deliverableCount = 0,
    completedCount = 0,
    latestComment,
    lastUpdated
  } = cellData;

  const inProgressCount = Math.max(0, deliverableCount - completedCount);
  const notStartedCount = status === 'NOT_STARTED' ? deliverableCount : 0;

  const handleViewFullHandover = () => {
    onOpenChange(false);
    navigate(`/p2a-handover/${handoverId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getStatusIcon(status)}
            <span className="truncate">{categoryName || 'Category Details'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={getStatusBadgeVariant(status)}>
                {getStatusLabel(status)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{deliverableCount} items
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/50 bg-green-500/10 p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="rounded-lg border border-border/50 bg-amber-500/10 p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{inProgressCount}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/50 p-3 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{notStartedCount}</div>
              <div className="text-xs text-muted-foreground">Not Started</div>
            </div>
          </div>

          {/* Latest Comment */}
          {latestComment && (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                Latest Comment
              </div>
              <ScrollArea className="max-h-24">
                <p className="text-sm italic">"{latestComment}"</p>
              </ScrollArea>
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <p className="text-xs text-muted-foreground text-center">
              Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </p>
          )}

          {/* Action Button */}
          <Button 
            onClick={handleViewFullHandover} 
            className="w-full gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View Full Handover
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
