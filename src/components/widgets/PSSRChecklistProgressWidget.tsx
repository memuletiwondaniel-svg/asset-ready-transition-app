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
  Maximize2
} from 'lucide-react';

export interface CategoryProgress {
  name: string;
  completed: number;
  total: number;
  percentage: number;
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
  size = 120 
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
  dotClass: string;
  bgClass: string;
  onClick?: () => void;
}> = ({ label, value, dotClass, bgClass, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-lg ${bgClass} hover:opacity-80 transition-all cursor-pointer group`}
  >
    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotClass}`} />
    <div className="text-left">
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
    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
  >
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
      <Icon className="h-4 w-4" />
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
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${progressClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
    <span className="text-sm font-semibold text-foreground w-12 text-right">{percentage}%</span>
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
  onStatClick,
  onCategoryClick,
  onViewAll,
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

  const getCategoryColors = (index: number) => {
    const colors = [
      { colorClass: 'bg-blue-500/20 text-blue-600', progressClass: 'bg-blue-500' },
      { colorClass: 'bg-purple-500/20 text-purple-600', progressClass: 'bg-purple-500' },
      { colorClass: 'bg-amber-500/20 text-amber-600', progressClass: 'bg-amber-500' },
      { colorClass: 'bg-cyan-500/20 text-cyan-600', progressClass: 'bg-cyan-500' },
      { colorClass: 'bg-emerald-500/20 text-emerald-600', progressClass: 'bg-emerald-500' },
    ];
    return colors[index % colors.length];
  };

  const statusPills = [
    { label: 'Draft', value: draftItems, dotClass: 'bg-gray-400', bgClass: 'bg-gray-500/10', filter: 'draft' },
    { label: 'Review', value: underReviewItems, dotClass: 'bg-yellow-500', bgClass: 'bg-yellow-500/10', filter: 'under_review' },
    { label: 'Approved', value: approvedItems, dotClass: 'bg-green-500', bgClass: 'bg-green-500/10', filter: 'approved' },
    ...(openActions > 0 ? [{ label: 'Actions', value: openActions, dotClass: 'bg-red-500', bgClass: 'bg-red-500/10', filter: 'actions' }] : []),
  ];

  return (
    <WidgetCard 
      title="Checklist"
      className={`min-h-[700px] ${
        widgetSize === 'compact' ? 'h-[700px]' :
        widgetSize === 'standard' ? 'h-[850px]' :
        'h-[1000px]'
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
      <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="space-y-4">
          {/* Hero Section - Circular Progress + Stats */}
          <div className="flex items-center gap-6 p-4 bg-muted/20 rounded-xl">
            <CircularProgress percentage={overallProgress} />
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-foreground mb-1">
                {approvedItems} of {totalItems}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">Items completed</p>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </div>

          {/* Status Pills Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statusPills.map((pill) => (
              <StatusPill
                key={pill.label}
                label={pill.label}
                value={pill.value}
                dotClass={pill.dotClass}
                bgClass={pill.bgClass}
                onClick={() => onStatClick?.(pill.filter)}
              />
            ))}
          </div>

          <Separator className="my-2" />

          {/* Category Progress Section */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Progress by Category
            </h4>
            <div className="space-y-1">
              {categoryProgress.map((category, index) => {
                const colors = getCategoryColors(index);
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
        </div>
      </div>
    </WidgetCard>
  );
};
