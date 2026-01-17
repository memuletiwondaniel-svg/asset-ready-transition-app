import React, { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';
import { cn } from '@/lib/utils';
import { 
  Wrench, 
  Shield, 
  FileText, 
  Users, 
  HeartPulse,
  Maximize2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  FileSearch,
  ArrowRight,
  CircleAlert
} from 'lucide-react';

export interface CategoryProgress {
  name: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface KeyActivity {
  name: string;
  status: 'Completed' | 'Scheduled' | 'Not Scheduled';
  date?: string;
  attendees?: number;
  type?: string;
}

interface PriorityActionStats {
  total: number;
  priorityA: { total: number; open: number; closed: number };
  priorityB: { total: number; open: number; closed: number };
}

interface PSSRChecklistProgressWidgetProps {
  // Overall stats
  totalItems: number;
  draftItems: number;
  underReviewItems: number;
  approvedItems: number;
  openActions?: number;
  
  // Progress
  overallProgress: number;
  categoryProgress: CategoryProgress[];
  
  // Priority Actions
  priorityActionStats?: PriorityActionStats;
  onPriorityActionsClick?: () => void;
  
  // Key Activities
  keyActivities?: KeyActivity[];
  onActivityClick?: (type: string) => void;
  
  // Interactions
  onStatClick?: (filter: string) => void;
  onCategoryClick?: (categoryName: string) => void;
  onViewAll?: () => void;
  
  // Drag support
  dragAttributes?: any;
  dragListeners?: any;
}

// Circular Progress Component
const CircularProgress: React.FC<{ percentage: number; size?: number }> = ({ 
  percentage, 
  size = 100 
}) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  const getProgressColor = () => {
    if (percentage >= 70) return '#10b981'; // emerald-500
    if (percentage >= 40) return '#f59e0b'; // amber-500
    return '#f97316'; // orange-500
  };

  const getProgressColorEnd = () => {
    if (percentage >= 70) return '#34d399'; // emerald-400
    if (percentage >= 40) return '#fbbf24'; // amber-400
    return '#fb923c'; // orange-400
  };

  return (
    <div className="relative drop-shadow-md" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id={`progressGradient-${percentage}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={getProgressColor()} />
            <stop offset="100%" stopColor={getProgressColorEnd()} />
          </linearGradient>
          <filter id="progressGlow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle
          className="stroke-muted/20"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={`url(#progressGradient-${percentage})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          filter="url(#progressGlow)"
          className="transition-all duration-700 ease-out"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground leading-none">{percentage}%</span>
        <span className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase mt-1">Complete</span>
      </div>
    </div>
  );
};

// Status Pill Component - Redesigned
const StatusPill: React.FC<{
  label: string;
  value: number;
  variant: 'pending' | 'review' | 'completed';
  onClick?: () => void;
}> = ({ label, value, variant, onClick }) => {
  const variantStyles = {
    pending: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 border-slate-500/20',
    review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20',
    completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:scale-[1.02]",
        variantStyles[variant]
      )}
    >
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs font-medium opacity-80">{label}</span>
    </button>
  );
};

// Category Progress Row Component
const CategoryProgressRow: React.FC<{
  name: string;
  completed: number;
  total: number;
  percentage: number;
  icon: React.ElementType;
  colorClass: string;
  progressClass: string;
  onClick?: () => void;
}> = ({ name, completed, total, percentage, icon: Icon, colorClass, progressClass, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 hover:shadow-md hover:scale-[1.02] transition-all duration-300 cursor-pointer group border border-transparent hover:border-border/50 group-has-[:hover]/list:opacity-40 group-has-[:hover]/list:grayscale hover:!opacity-100 hover:!grayscale-0"
  >
    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110", colorClass)}>
      <Icon className="h-4 w-4 transition-transform duration-200 group-hover:rotate-3" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground truncate">{name}</span>
        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
          {completed}/{total}
        </span>
      </div>
      <div className="relative h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div 
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500 group-hover:brightness-110", progressClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  </button>
);

export const PSSRChecklistProgressWidget: React.FC<PSSRChecklistProgressWidgetProps> = ({
  totalItems,
  draftItems,
  underReviewItems,
  approvedItems,
  openActions = 0,
  overallProgress,
  categoryProgress,
  priorityActionStats,
  onPriorityActionsClick,
  keyActivities = [],
  onActivityClick,
  onStatClick,
  onCategoryClick,
  onViewAll,
  dragAttributes,
  dragListeners,
}) => {
  const { widgetSize } = useWidgetSize();
  const widgetId = 'pssr-checklist-progress';
  const [activitiesExpanded, setActivitiesExpanded] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState(true);

  const remainingItems = totalItems - approvedItems;
  const hasPriorityAOpen = priorityActionStats && priorityActionStats.priorityA.open > 0;

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('hardware') || name.includes('integrity')) return Wrench;
    if (name.includes('process') || name.includes('safety')) return Shield;
    if (name.includes('documentation') || name.includes('document')) return FileText;
    if (name.includes('organization') || name.includes('org')) return Users;
    if (name.includes('health') || name.includes('hse')) return HeartPulse;
    return FileText;
  };

  const getCategoryColors = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    
    if (name.includes('hardware') || name.includes('integrity')) {
      return { colorClass: 'bg-blue-300/10 text-blue-400', progressClass: 'bg-blue-300/50' };
    }
    if (name.includes('process') || name.includes('safety')) {
      return { colorClass: 'bg-rose-300/10 text-rose-400', progressClass: 'bg-rose-300/50' };
    }
    if (name.includes('documentation') || name.includes('document')) {
      return { colorClass: 'bg-yellow-300/10 text-yellow-500', progressClass: 'bg-yellow-400/50' };
    }
    if (name.includes('organization') || name.includes('org')) {
      return { colorClass: 'bg-violet-300/10 text-violet-400', progressClass: 'bg-violet-300/40' };
    }
    if (name.includes('health') || name.includes('hse')) {
      return { colorClass: 'bg-emerald-300/10 text-emerald-400', progressClass: 'bg-emerald-300/50' };
    }
    return { colorClass: 'bg-primary/5 text-primary/70', progressClass: 'bg-primary/50' };
  };

  return (
    <WidgetCard 
      title="Progress"
      className={cn(
        "min-h-[579px] md:min-h-[652px] lg:min-h-[716px]",
        widgetSize === 'compact' ? 'h-[579px] md:h-[652px] lg:h-[716px]' :
        widgetSize === 'standard' ? 'h-[758px] md:h-[821px] lg:h-[895px]' :
        'h-[969px] md:h-[1032px] lg:h-[1106px]'
      )}
      widgetId={widgetId}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
      showHeaderActionOnHover={true}
      headerAction={
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onViewAll}
          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          View All
        </Button>
      }
    >
      <div className="h-full overflow-y-auto pr-2 scrollbar-auto-hide">
        <div className="space-y-4">
          
          {/* Hero Section - Simplified (Removed horizontal progress bar) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20">
            <div className="flex items-center gap-6">
              <CircularProgress percentage={overallProgress} size={100} />
              <div className="flex-1">
                <div className="text-xl font-semibold text-foreground">
                  {remainingItems} items to go
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  of {totalItems} total items
                </div>
              </div>
            </div>
          </div>

          {/* Priority Actions Section - Clean Modern Design */}
          {priorityActionStats && (
            <div 
              onClick={() => onPriorityActionsClick?.()}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all duration-200 group/priority",
                "bg-card hover:bg-accent/5",
                "border-border/50 hover:border-primary/30"
              )}
            >
              {/* Hero Numbers Row */}
              <div className="flex items-center gap-6 mb-3">
                {/* Pr1 - Primary focus */}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-3xl font-bold tabular-nums",
                    priorityActionStats.priorityA.open > 0 ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {priorityActionStats.priorityA.open}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">Priority 1</span>
                    <span className="text-[10px] text-muted-foreground">Before startup</span>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="h-10 w-px bg-border/50" />
                
                {/* Pr2 - Secondary */}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-2xl font-semibold tabular-nums",
                    priorityActionStats.priorityB.open > 0 ? "text-amber-500" : "text-muted-foreground"
                  )}>
                    {priorityActionStats.priorityB.open}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">Priority 2</span>
                    <span className="text-[10px] text-muted-foreground">After startup</span>
                  </div>
                </div>
                
                {/* Expand arrow */}
                <div className="ml-auto">
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover/priority:opacity-100 group-hover/priority:translate-x-1 transition-all" />
                </div>
              </div>
              
              {/* Subtle progress footer - only show when items exist */}
              {priorityActionStats.total > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-muted/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/60 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${((priorityActionStats.priorityA.closed + priorityActionStats.priorityB.closed) / priorityActionStats.total) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {priorityActionStats.priorityA.closed + priorityActionStats.priorityB.closed} of {priorityActionStats.total} closed
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Status Pills - Renamed (Draft→Pending, Approved→Completed) */}
          <div className="flex justify-center gap-4">
            <StatusPill 
              label="Pending" 
              value={draftItems} 
              variant="pending"
              onClick={() => onStatClick?.('draft')}
            />
            <StatusPill 
              label="In Review" 
              value={underReviewItems} 
              variant="review"
              onClick={() => onStatClick?.('under_review')}
            />
            <StatusPill 
              label="Completed" 
              value={approvedItems} 
              variant="completed"
              onClick={() => onStatClick?.('approved')}
            />
          </div>

          {/* Category Progress Section - Collapsible */}
          <Collapsible open={categoryExpanded} onOpenChange={setCategoryExpanded}>
            <div className="pt-3 border-t border-border/40">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between cursor-pointer hover:bg-accent/5 transition-colors rounded-sm py-1 px-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Progress by Category
                    </span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    categoryExpanded ? 'rotate-0' : '-rotate-90'
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0 group/list mt-2">
                  {categoryProgress.map((category) => {
                    const colors = getCategoryColors(category.name);
                    return (
                      <CategoryProgressRow
                        key={category.name}
                        name={category.name}
                        completed={category.completed}
                        total={category.total}
                        percentage={category.percentage}
                        icon={getCategoryIcon(category.name)}
                        colorClass={colors.colorClass}
                        progressClass={colors.progressClass}
                        onClick={() => onCategoryClick?.(category.name)}
                      />
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Key Activities Section - Collapsible */}
          {keyActivities.length > 0 && (
            <Collapsible open={activitiesExpanded} onOpenChange={setActivitiesExpanded}>
              <div className="pt-3 border-t border-border/40">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between cursor-pointer hover:bg-accent/5 transition-colors rounded-sm py-1 px-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Key Activities
                      </span>
                      <span className="text-xs text-muted-foreground/60">({keyActivities.length})</span>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      activitiesExpanded ? 'rotate-0' : '-rotate-90'
                    )} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1 mt-2">
                    {keyActivities.map((activity) => {
                      const getStatusConfig = () => {
                        switch (activity.status) {
                          case 'Completed':
                            return {
                              icon: CheckCircle2,
                              bgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                              badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            };
                          case 'Scheduled':
                            return {
                              icon: Clock,
                              bgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                              badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            };
                          default:
                            return {
                              icon: AlertCircle,
                              bgClass: 'bg-muted text-muted-foreground/60',
                              badgeClass: 'bg-muted text-muted-foreground/60 border-border'
                            };
                        }
                      };
                      const config = getStatusConfig();
                      const Icon = config.icon;
                      
                      return (
                        <button
                          key={activity.name}
                          onClick={() => onActivityClick?.(activity.type || activity.name)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bgClass)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <span className="text-xs font-medium text-foreground truncate block">{activity.name}</span>
                            {activity.date && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                          <span className={cn("text-[10px] font-medium px-2 py-1 rounded-full border", config.badgeClass)}>
                            {activity.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

        </div>
      </div>
    </WidgetCard>
  );
};
