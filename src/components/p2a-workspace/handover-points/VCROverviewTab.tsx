import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Target, 
  Layers, 
  ClipboardCheck, 
  GraduationCap, 
  FileText, 
  BookOpen, 
  Settings2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../hooks/useVCRPrerequisites';
import { useHandoverPointSystems } from '../hooks/useP2AHandoverPoints';
import { format, differenceInDays, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface VCROverviewTabProps {
  handoverPoint: P2AHandoverPoint;
  onNavigateToTab?: (tabId: string) => void;
  isLocked?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'SIGNED':
      return { label: 'Signed', color: 'bg-emerald-500', icon: CheckCircle2 };
    case 'READY':
      return { label: 'Ready for Sign-off', color: 'bg-blue-500', icon: Target };
    case 'IN_PROGRESS':
      return { label: 'In Progress', color: 'bg-amber-500', icon: Settings2 };
    default:
      return { label: 'Pending', color: 'bg-slate-400', icon: AlertTriangle };
  }
};

export const VCROverviewTab: React.FC<VCROverviewTabProps> = ({ handoverPoint, onNavigateToTab }) => {
  const { systems, isLoading: systemsLoading } = useHandoverPointSystems(handoverPoint.id);
  const { prerequisites, progress, isLoading: prereqLoading } = useVCRPrerequisites(handoverPoint.id);

  const statusConfig = getStatusConfig(handoverPoint.status);
  const StatusIcon = statusConfig.icon;

  // Calculate days to target date
  const getDaysToTarget = () => {
    if (!handoverPoint.target_date) return null;
    const targetDate = new Date(handoverPoint.target_date);
    const days = differenceInDays(targetDate, new Date());
    const isOverdue = isPast(targetDate);
    
    return {
      days: Math.abs(days),
      isOverdue,
      label: isOverdue ? `${Math.abs(days)} days overdue` : `${days} days to go`,
      urgency: isOverdue ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-emerald-500',
    };
  };

  const targetInfo = getDaysToTarget();

  // Calculate systems readiness
  const systemsReadiness = systems.length > 0
    ? Math.round(systems.reduce((sum, s: any) => sum + (s.completion_percentage || 0), 0) / systems.length)
    : 0;

  const progressItems = [
    { 
      label: 'Systems Readiness', 
      value: systemsReadiness, 
      icon: Layers, 
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      tabId: 'systems'
    },
    { 
      label: 'Checklist Items', 
      value: progress.checklist, 
      icon: ClipboardCheck, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      tabId: 'checklist'
    },
    { 
      label: 'Training', 
      value: progress.training, 
      icon: GraduationCap, 
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
      tabId: 'training'
    },
    { 
      label: 'Documentation', 
      value: progress.documentation, 
      icon: FileText, 
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      tabId: 'documentation'
    },
    { 
      label: 'Procedures', 
      value: progress.procedures, 
      icon: BookOpen, 
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      tabId: 'procedures'
    },
    { 
      label: 'CMMS', 
      value: progress.cmms, 
      icon: Settings2, 
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      tabId: 'cmms'
    },
  ];

  if (systemsLoading || prereqLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Status and Target Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Description Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              {handoverPoint.description || 'No description provided for this VCR.'}
            </p>
          </CardContent>
        </Card>

        {/* Target Date Card */}
        <Card className={cn(
          "border-l-4",
          targetInfo?.isOverdue ? "border-l-red-500" : 
          targetInfo?.days && targetInfo.days <= 7 ? "border-l-amber-500" : "border-l-emerald-500"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Target Handover Date</div>
                {handoverPoint.target_date ? (
                  <>
                    <div className="text-xl font-bold text-foreground">
                      {format(new Date(handoverPoint.target_date), 'dd MMM yyyy')}
                    </div>
                    {targetInfo && (
                      <div className={cn("text-sm font-medium", targetInfo.urgency)}>
                        {targetInfo.label}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-lg text-muted-foreground">Not set</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-cyan-500">{systems.length}</div>
            <div className="text-xs text-muted-foreground">Systems</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{prerequisites.length}</div>
            <div className="text-xs text-muted-foreground">Checklist Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-500">{progress.overall}%</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Readiness Progress</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {progressItems.map((item) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.label} 
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => onNavigateToTab?.(item.tabId)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.bgColor)}>
                      <Icon className={cn("w-4 h-4", item.color)} />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={item.value} 
                      className="h-1.5 flex-1" 
                      indicatorClassName={item.color.replace('text-', 'bg-')}
                    />
                    <span className={cn("text-sm font-bold", item.color)}>{item.value}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
