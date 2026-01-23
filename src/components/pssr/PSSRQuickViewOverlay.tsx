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
import { Separator } from '@/components/ui/separator';
import { 
  ExternalLink, 
  Calendar, 
  FileText, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Zap,
  Shield,
  Users,
  Settings,
  Building2,
  Wrench,
  Gauge,
  ClipboardCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePSSRCategoryProgress, CategoryProgress } from '@/hooks/usePSSRCategoryProgress';
import { usePSSRDetails } from '@/hooks/usePSSRDetails';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PSSRQuickViewOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  pssrDisplayId: string;
}

const getCategoryIcon = (categoryName: string) => {
  const iconMap: Record<string, React.ElementType> = {
    'Technical Integrity': Wrench,
    'Process Safety': Shield,
    'Organization': Users,
    'Operations': Settings,
    'Electrical': Zap,
    'Mechanical': Gauge,
    'Instrumentation': Gauge,
    'Civil': Building2,
    'HSE': Shield,
  };
  return iconMap[categoryName] || ClipboardCheck;
};

const getCategoryColors = (categoryName: string) => {
  const colorMap: Record<string, { bg: string; progress: string }> = {
    'Technical Integrity': { bg: 'bg-blue-500/10 text-blue-600', progress: 'bg-blue-500' },
    'Process Safety': { bg: 'bg-red-500/10 text-red-600', progress: 'bg-red-500' },
    'Organization': { bg: 'bg-purple-500/10 text-purple-600', progress: 'bg-purple-500' },
    'Operations': { bg: 'bg-amber-500/10 text-amber-600', progress: 'bg-amber-500' },
    'Electrical': { bg: 'bg-yellow-500/10 text-yellow-600', progress: 'bg-yellow-500' },
    'Mechanical': { bg: 'bg-slate-500/10 text-slate-600', progress: 'bg-slate-500' },
    'Instrumentation': { bg: 'bg-cyan-500/10 text-cyan-600', progress: 'bg-cyan-500' },
    'Civil': { bg: 'bg-orange-500/10 text-orange-600', progress: 'bg-orange-500' },
    'HSE': { bg: 'bg-green-500/10 text-green-600', progress: 'bg-green-500' },
  };
  return colorMap[categoryName] || { bg: 'bg-muted text-muted-foreground', progress: 'bg-primary' };
};

const getStatusBadge = (status: string) => {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower === 'approved' || statusLower === 'completed') {
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>;
  }
  if (statusLower === 'in-review' || statusLower === 'under review') {
    return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">In Review</Badge>;
  }
  return <Badge className="bg-muted text-muted-foreground">Draft</Badge>;
};

export const PSSRQuickViewOverlay: React.FC<PSSRQuickViewOverlayProps> = ({
  open,
  onOpenChange,
  pssrId,
  pssrDisplayId,
}) => {
  const navigate = useNavigate();
  const { pssr: pssrDetails, isLoading: detailsLoading } = usePSSRDetails(pssrId);
  const { data: categoryProgress, isLoading: progressLoading } = usePSSRCategoryProgress(pssrId);

  const isLoading = detailsLoading || progressLoading;

  // Calculate overall progress
  const overallProgress = React.useMemo(() => {
    if (!categoryProgress || categoryProgress.length === 0) return 0;
    const totalCompleted = categoryProgress.reduce((sum, c) => sum + c.completed, 0);
    const totalItems = categoryProgress.reduce((sum, c) => sum + c.total, 0);
    return totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
  }, [categoryProgress]);

  // Key events mock data (in real app, fetch from pssr_events or similar)
  const keyEvents = React.useMemo(() => {
    const events = [];
    if (pssrDetails?.created_at) {
      events.push({
        id: '1',
        type: 'created',
        title: 'PSSR Created',
        date: pssrDetails.created_at,
        icon: FileText,
      });
    }
    if (pssrDetails?.status === 'IN-REVIEW' || pssrDetails?.status === 'APPROVED') {
      events.push({
        id: '2',
        type: 'submitted',
        title: 'Submitted for Review',
        date: pssrDetails.updated_at || pssrDetails.created_at,
        icon: Clock,
      });
    }
    if (pssrDetails?.status === 'APPROVED') {
      events.push({
        id: '3',
        type: 'approved',
        title: 'Approved',
        date: pssrDetails.updated_at,
        icon: CheckCircle2,
      });
    }
    return events;
  }, [pssrDetails]);

  const handleViewFullDetails = () => {
    onOpenChange(false);
    navigate(`/pssr/${pssrId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[90vw] max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold text-primary mb-1">
                {pssrDisplayId}
              </DialogTitle>
              {pssrDetails?.scope && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {pssrDetails.scope}
                </p>
              )}
            </div>
            {pssrDetails && getStatusBadge(pssrDetails.status)}
          </div>
          
          {/* Overall Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">Overall Progress</span>
              <span className="text-sm font-bold text-foreground">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-5 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Category Breakdown */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Category Breakdown
                </h4>
                <div className="space-y-2">
                  {categoryProgress && categoryProgress.length > 0 ? (
                    categoryProgress.map((category) => {
                      const Icon = getCategoryIcon(category.name);
                      const colors = getCategoryColors(category.name);
                      return (
                        <div
                          key={category.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className={cn('w-7 h-7 rounded-md flex items-center justify-center', colors.bg)}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-foreground truncate">
                                {category.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-2">
                                {category.completed}/{category.total}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', colors.progress)}
                                style={{ width: `${category.percentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-foreground w-8 text-right">
                            {category.percentage}%
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No checklist items found
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Key Events */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Key Events
                </h4>
                <div className="space-y-2">
                  {keyEvents.length > 0 ? (
                    keyEvents.map((event) => {
                      const Icon = event.icon;
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-foreground flex-1">
                            {event.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(event.date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground">No events recorded</p>
                  )}
                </div>
              </div>

              {/* PSSR Info */}
              {pssrDetails && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Asset</span>
                      <p className="font-medium text-foreground">{pssrDetails.asset || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reason</span>
                      <p className="font-medium text-foreground">{pssrDetails.reason || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created</span>
                      <p className="font-medium text-foreground">
                        {pssrDetails.created_at
                          ? format(new Date(pssrDetails.created_at), 'MMM d, yyyy')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PSSR Lead</span>
                      <p className="font-medium text-foreground">
                        {pssrDetails.pssr_lead?.full_name || '-'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/40 bg-muted/20">
          <Button onClick={handleViewFullDetails} className="w-full" size="sm">
            <ExternalLink className="h-3.5 w-3.5 mr-2" />
            View Full PSSR Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
