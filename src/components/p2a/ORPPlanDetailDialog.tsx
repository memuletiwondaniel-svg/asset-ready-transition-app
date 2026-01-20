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
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  Circle,
  ExternalLink,
  ArrowRight,
  FileText
} from 'lucide-react';
import { ORPCellClickData } from './P2AHeatmap';

interface ORPPlanDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cellData: ORPCellClickData | null;
}

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'COMPLETED':
      return 'default';
    case 'ON_HOLD':
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
    case 'COMPLETED':
      return 'Completed';
    case 'ON_HOLD':
      return 'On Hold';
    case 'DRAFT':
      return 'Draft';
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
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getPhaseLabel = (phase?: string) => {
  switch (phase) {
    case 'ASSESS_SELECT': return 'Assess & Select';
    case 'DEFINE': return 'Define';
    case 'EXECUTE': return 'Execute';
    default: return phase || '';
  }
};

export const ORPPlanDetailDialog: React.FC<ORPPlanDetailDialogProps> = ({
  open,
  onOpenChange,
  cellData
}) => {
  const navigate = useNavigate();

  if (!cellData) return null;

  const {
    orpPlanId,
    projectId,
    categoryName,
    status,
    percentage,
    deliverableCount = 0,
    completedCount = 0,
    inProgressCount = 0,
    lastUpdated,
    planPhase,
    planStatus,
    projectTitle,
    projectCode
  } = cellData;

  const notStartedCount = Math.max(0, deliverableCount - completedCount - inProgressCount);

  const handleViewProject = () => {
    onOpenChange(false);
    navigate(`/project/${projectId}`);
  };

  const handleViewORPPlan = () => {
    onOpenChange(false);
    navigate(`/ora-plan/${orpPlanId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getStatusIcon(status)}
            <div className="flex flex-col">
              <span className="truncate">{categoryName || 'Deliverable Details'}</span>
              {projectCode && (
                <span className="text-xs font-normal text-muted-foreground">{projectCode}</span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Info */}
          {projectTitle && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Project</p>
              <p className="text-sm font-medium truncate">{projectTitle}</p>
            </div>
          )}

          {/* Plan Phase and Status */}
          <div className="flex items-center gap-3">
            {planPhase && (
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {getPhaseLabel(planPhase)}
              </Badge>
            )}
            {planStatus && (
              <Badge variant={getStatusBadgeVariant(planStatus)} className="text-xs">
                {getStatusLabel(planStatus)}
              </Badge>
            )}
          </div>

          {/* Category Status and Progress */}
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

          {/* Last Updated */}
          {lastUpdated && (
            <p className="text-xs text-muted-foreground text-center">
              Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleViewProject} 
              className="flex-1 gap-2"
            >
              View Project
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleViewORPPlan} 
              className="flex-1 gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View ORP Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
