import React from 'react';
import { WidgetCard } from './WidgetCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';
import { 
  Wrench, 
  Shield, 
  FileText, 
  Users, 
  HeartPulse,
  Maximize2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar
} from 'lucide-react';

export interface CategoryProgress {
  name: string;
  completed: number;
  total: number;
  percentage: number;
}

interface KeyActivity {
  name: string;
  status: 'Completed' | 'Scheduled' | 'Not Scheduled';
  date?: string;
  attendees?: number;
  type?: string;
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
  
  // Key Activities
  keyActivities?: KeyActivity[];
  
  // Interactions
  onStatClick?: (filter: string) => void;
  onCategoryClick?: (categoryName: string) => void;
  onViewAll?: () => void;
  onActivityClick?: (type: string) => void;
  
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
    if (percentage >= 70) return 'stroke-green-500';
    if (percentage >= 40) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          className="stroke-muted/30"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={`${getProgressColor()} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{percentage}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Complete</span>
      </div>
    </div>
  );
};

// Status Pill Component
const StatusPill: React.FC<{
  label: string;
  value: number;
  bgClass: string;
  onClick?: () => void;
}> = ({ label, value, bgClass, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center px-3 sm:px-4 py-2.5 rounded-lg ${bgClass} hover:opacity-80 transition-all cursor-pointer group`}
  >
    <div className="text-center">
      <p className="text-base sm:text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide whitespace-nowrap">{label}</p>
    </div>
  </button>
);

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
    className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
  >
    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${colorClass}`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs font-medium text-foreground truncate">{name}</span>
        <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
          {completed}/{total}
        </span>
      </div>
      <div className="relative h-1 bg-muted/50 rounded-full overflow-hidden">
        <div 
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${progressClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  </button>
);

// Key Activity Item Component
const KeyActivityItem: React.FC<{
  name: string;
  status: 'Completed' | 'Scheduled' | 'Not Scheduled';
  date?: string;
  onClick?: () => void;
}> = ({ name, status, date, onClick }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'Completed':
        return {
          icon: CheckCircle2,
          bgClass: 'bg-muted text-green-600',
          badgeClass: 'bg-muted text-green-600 border-border'
        };
      case 'Scheduled':
        return {
          icon: Clock,
          bgClass: 'bg-muted text-muted-foreground',
          badgeClass: 'bg-muted text-muted-foreground border-border'
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
      onClick={onClick}
      className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
    >
      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${config.bgClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <span className="text-xs font-medium text-foreground truncate block">{name}</span>
        {date && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-2.5 w-2.5" />
            {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${config.badgeClass}`}>
        {status}
      </span>
    </button>
  );
};

export const PSSRChecklistProgressWidget: React.FC<PSSRChecklistProgressWidgetProps> = ({
  totalItems,
  draftItems,
  underReviewItems,
  approvedItems,
  openActions = 0,
  overallProgress,
  categoryProgress,
  keyActivities,
  onStatClick,
  onCategoryClick,
  onViewAll,
  onActivityClick,
  dragAttributes,
  dragListeners,
}) => {
  const { widgetSize } = useWidgetSize();
  const widgetId = 'pssr-checklist-progress';

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

  const statusPills = [
    { label: 'Draft', value: draftItems, bgClass: 'bg-muted/50', filter: 'draft' },
    { label: 'Review', value: underReviewItems, bgClass: 'bg-muted/50', filter: 'under_review' },
    { label: 'Approved', value: approvedItems, bgClass: 'bg-muted/50', filter: 'approved' },
    ...(openActions > 0 ? [{ label: 'Actions', value: openActions, bgClass: 'bg-muted/50', filter: 'actions' }] : []),
  ];

  return (
    <WidgetCard 
      title="Progress"
      className={`min-h-[526px] md:min-h-[593px] lg:min-h-[651px] ${
        widgetSize === 'compact' ? 'h-[526px] md:h-[593px] lg:h-[651px]' :
        widgetSize === 'standard' ? 'h-[689px] md:h-[746px] lg:h-[814px]' :
        'h-[881px] md:h-[938px] lg:h-[1005px]'
      }`}
      widgetId={widgetId}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
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
        <div className="space-y-3">
          {/* Hero Section - Circular Progress + Stats */}
          <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-xl">
            <CircularProgress percentage={overallProgress} />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground mb-0.5">
                {approvedItems} of {totalItems}
              </h3>
              <p className="text-xs text-muted-foreground mb-2">Items completed</p>
              <Progress value={overallProgress} className="h-1.5" />
            </div>
          </div>

          {/* Status Pills Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statusPills.map((pill) => (
              <StatusPill
                key={pill.label}
                label={pill.label}
                value={pill.value}
                bgClass={pill.bgClass}
                onClick={() => onStatClick?.(pill.filter)}
              />
            ))}
          </div>

          <Separator className="my-1.5" />

          {/* Category Progress Section */}
          <div>
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Progress by Category
            </h4>
            <div className="space-y-0.5">
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
          </div>

          {/* Key Activities Section */}
          {keyActivities && keyActivities.length > 0 && (
            <>
              <Separator className="my-1.5" />
              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Key Activities
                </h4>
                <div className="space-y-0.5">
                  {keyActivities.map((activity) => (
                    <KeyActivityItem
                      key={activity.name}
                      name={activity.name}
                      status={activity.status}
                      date={activity.date}
                      onClick={() => onActivityClick?.(activity.type || activity.name)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </WidgetCard>
  );
};
