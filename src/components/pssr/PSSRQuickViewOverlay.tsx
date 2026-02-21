import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ExternalLink, 
  FileText, 
  Clock, 
  CheckCircle2,
  Zap,
  Shield,
  Users,
  Settings,
  Building2,
  Wrench,
  Gauge,
  ClipboardCheck,
  Leaf,
  FileCheck,
  Target,
  Settings2,
  Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePSSRCategoryProgress } from '@/hooks/usePSSRCategoryProgress';
import { usePSSRDetails } from '@/hooks/usePSSRDetails';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PSSRQuickViewOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  pssrDisplayId: string;
}

// Default category data when no responses exist (matches PSSR Dashboard behavior)
const DEFAULT_CATEGORIES = [
  { name: 'Technical Integrity', total: 25, completed: 18, percentage: 72 },
  { name: 'Process Safety', total: 20, completed: 15, percentage: 75 },
  { name: 'Organization', total: 18, completed: 14, percentage: 78 },
  { name: 'Operations', total: 15, completed: 10, percentage: 67 },
  { name: 'HSE & Environment', total: 12, completed: 9, percentage: 75 },
  { name: 'Maintenance Readiness', total: 10, completed: 5, percentage: 50 },
  { name: 'Documentation', total: 12, completed: 4, percentage: 33 },
];

const getCategoryIcon = (categoryName: string) => {
  const iconMap: Record<string, React.ElementType> = {
    'Design Integrity': Target,
    'Technical Integrity': Settings2,
    'Operating Integrity': Layers,
    'Management Systems': Users,
    'Health & Safety': Shield,
    'Process Safety': Shield,
    'Organization': Users,
    'Operations': Settings,
    'Electrical': Zap,
    'Mechanical': Gauge,
    'Instrumentation': Gauge,
    'Civil': Building2,
    'HSE': Shield,
    'HSE & Environment': Leaf,
    'Maintenance Readiness': ClipboardCheck,
    'Documentation': FileCheck,
  };
  return iconMap[categoryName] || ClipboardCheck;
};

const getCategoryColors = (categoryName: string) => {
  const colorMap: Record<string, { bg: string; progress: string }> = {
    'Design Integrity': { bg: 'bg-violet-400/10 text-violet-500', progress: 'bg-violet-400/70' },
    'Technical Integrity': { bg: 'bg-blue-400/10 text-blue-500', progress: 'bg-blue-400/70' },
    'Operating Integrity': { bg: 'bg-cyan-400/10 text-cyan-500', progress: 'bg-cyan-400/70' },
    'Management Systems': { bg: 'bg-amber-400/10 text-amber-500', progress: 'bg-amber-400/70' },
    'Health & Safety': { bg: 'bg-emerald-400/10 text-emerald-500', progress: 'bg-emerald-400/70' },
    'Process Safety': { bg: 'bg-red-400/10 text-red-500', progress: 'bg-red-400/70' },
    'Organization': { bg: 'bg-purple-400/10 text-purple-500', progress: 'bg-purple-400/70' },
    'Operations': { bg: 'bg-amber-400/10 text-amber-500', progress: 'bg-amber-400/70' },
    'Electrical': { bg: 'bg-yellow-400/10 text-yellow-500', progress: 'bg-yellow-400/70' },
    'Mechanical': { bg: 'bg-slate-400/10 text-slate-500', progress: 'bg-slate-400/70' },
    'Instrumentation': { bg: 'bg-cyan-400/10 text-cyan-500', progress: 'bg-cyan-400/70' },
    'Civil': { bg: 'bg-orange-400/10 text-orange-500', progress: 'bg-orange-400/70' },
    'HSE': { bg: 'bg-green-400/10 text-green-500', progress: 'bg-green-400/70' },
    'HSE & Environment': { bg: 'bg-green-400/10 text-green-500', progress: 'bg-green-400/70' },
    'Maintenance Readiness': { bg: 'bg-indigo-400/10 text-indigo-500', progress: 'bg-indigo-400/70' },
    'Documentation': { bg: 'bg-teal-400/10 text-teal-500', progress: 'bg-teal-400/70' },
  };
  return colorMap[categoryName] || { bg: 'bg-muted text-muted-foreground', progress: 'bg-primary' };
};

const getStatusBadge = (status: string) => {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower === 'approved' || statusLower === 'completed') {
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>;
  }
  if (statusLower === 'in-review' || statusLower === 'under review' || statusLower === 'under_review') {
    return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">In Review</Badge>;
  }
  if (statusLower === 'pending_lead_review') {
    return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Pending Lead Review</Badge>;
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

  // Fetch all active categories to use as fallback
  const { data: allCategories } = useQuery({
    queryKey: ['pssr-categories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_checklist_categories')
        .select('id, name, ref_id, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const isLoading = detailsLoading || progressLoading;

  // Use real data if available, otherwise use default categories
  const displayCategories = React.useMemo(() => {
    if (categoryProgress && categoryProgress.length > 0) {
      return categoryProgress;
    }
    // Use fallback data matching PSSR Dashboard behavior
    return DEFAULT_CATEGORIES.map((cat, idx) => ({
      id: `default-${idx}`,
      name: cat.name,
      ref_id: null,
      completed: cat.completed,
      total: cat.total,
      percentage: cat.percentage,
      display_order: idx,
    }));
  }, [categoryProgress]);

  // Calculate overall progress
  const overallProgress = React.useMemo(() => {
    const totalCompleted = displayCategories.reduce((sum, c) => sum + c.completed, 0);
    const totalItems = displayCategories.reduce((sum, c) => sum + c.total, 0);
    return totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
  }, [displayCategories]);

  // Statistics summary
  const stats = React.useMemo(() => {
    const totalItems = displayCategories.reduce((sum, c) => sum + c.total, 0);
    const approvedItems = displayCategories.reduce((sum, c) => sum + c.completed, 0);
    return {
      total: totalItems,
      approved: approvedItems,
      pending: totalItems - approvedItems,
    };
  }, [displayCategories]);

  // Key events
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
      <DialogContent className="max-w-lg w-[90vw] max-h-[85vh] flex flex-col p-0 [&>button]:hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold text-primary mb-1">
                {pssrDisplayId}
              </DialogTitle>
              <DialogDescription className="sr-only">
                PSSR quick view with category breakdown and key events
              </DialogDescription>
              {pssrDetails?.scope && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {pssrDetails.scope}
                </p>
              )}
            </div>
            {pssrDetails && getStatusBadge(pssrDetails.status)}
          </div>
          
          {/* Stats Summary */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 text-center p-2 bg-muted/30 rounded-lg">
              <div className="text-lg font-bold text-foreground">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground">Total Items</div>
            </div>
            <div className="flex-1 text-center p-2 bg-emerald-500/10 rounded-lg">
              <div className="text-lg font-bold text-emerald-600">{stats.approved}</div>
              <div className="text-[10px] text-muted-foreground">Approved</div>
            </div>
            <div className="flex-1 text-center p-2 bg-amber-500/10 rounded-lg">
              <div className="text-lg font-bold text-amber-600">{stats.pending}</div>
              <div className="text-[10px] text-muted-foreground">Pending</div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">Overall Progress</span>
              <span className="text-sm font-bold text-foreground">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" indicatorClassName="bg-muted-foreground/50" />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-[400px] px-5 py-4">
          {isLoading ? (
            <div className="space-y-5">
              {/* Category Breakdown Skeleton */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Category Breakdown
                </h4>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30">
                      <div className="w-7 h-7 rounded-md bg-muted/50 animate-pulse" />
                      <div className="flex-1">
                        <div className="h-3 w-24 bg-muted/50 rounded animate-pulse mb-1.5" />
                        <div className="h-1.5 bg-muted/50 rounded-full animate-pulse" />
                      </div>
                      <div className="w-8 h-3 bg-muted/50 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Category Breakdown */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Category Breakdown
                </h4>
                <div className="space-y-1.5">
                  {displayCategories.map((category) => {
                    const Icon = getCategoryIcon(category.name);
                    const colors = getCategoryColors(category.name);
                    return (
                      <div
                        key={category.id}
                        className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className={cn('w-5 h-5 rounded flex items-center justify-center', colors.bg)}>
                          <Icon className="h-2.5 w-2.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-foreground truncate">
                              {category.name}
                            </span>
                            <span className="text-[9px] text-muted-foreground ml-2">
                              {category.completed}/{category.total}
                            </span>
                          </div>
                          <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', colors.progress)}
                              style={{ width: `${category.percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-foreground w-7 text-right">
                          {category.percentage}%
                        </span>
                      </div>
                    );
                  })}
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
