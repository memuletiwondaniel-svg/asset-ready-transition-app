import React from 'react';
import { WidgetCard } from './WidgetCard';
import { Progress } from '@/components/ui/progress';
import { Settings, Shield, FileText, Users, AlertTriangle, BarChart3 } from 'lucide-react';

interface CategoryProgress {
  name: string;
  completed: number;
  total: number;
  percentage: number;
}

interface PSSRProgressWidgetProps {
  overallProgress: number;
  categoryProgress: CategoryProgress[];
  onCategoryClick?: (categoryName: string) => void;
}

export const PSSRProgressWidget: React.FC<PSSRProgressWidgetProps> = ({
  overallProgress,
  categoryProgress,
  onCategoryClick
}) => {
  const getCategoryIcon = (name: string) => {
    const iconMap: Record<string, any> = {
      'Hardware Integrity': Settings,
      'Process Safety': Shield,
      'Documentation': FileText,
      'Organization': Users,
      'Health & Safety': AlertTriangle,
      'General': BarChart3
    };
    return iconMap[name] || BarChart3;
  };

  const getCategoryColors = (name: string) => {
    const colorMap: Record<string, { bg: string; icon: string; progress: string; border: string }> = {
      'Hardware Integrity': {
        bg: 'bg-blue-500/10',
        icon: 'text-blue-600 dark:text-blue-400',
        progress: '[&>div]:bg-blue-500/60',
        border: 'border-blue-500/40 hover:border-blue-500/60'
      },
      'Process Safety': {
        bg: 'bg-emerald-500/10',
        icon: 'text-emerald-600 dark:text-emerald-400',
        progress: '[&>div]:bg-emerald-500/60',
        border: 'border-emerald-500/40 hover:border-emerald-500/60'
      },
      'Documentation': {
        bg: 'bg-amber-500/10',
        icon: 'text-amber-600 dark:text-amber-400',
        progress: '[&>div]:bg-amber-500/60',
        border: 'border-amber-500/40 hover:border-amber-500/60'
      },
      'Organization': {
        bg: 'bg-purple-500/10',
        icon: 'text-purple-600 dark:text-purple-400',
        progress: '[&>div]:bg-purple-500/60',
        border: 'border-purple-500/40 hover:border-purple-500/60'
      },
      'Health & Safety': {
        bg: 'bg-red-500/10',
        icon: 'text-red-600 dark:text-red-400',
        progress: '[&>div]:bg-red-500/60',
        border: 'border-red-500/40 hover:border-red-500/60'
      },
      'General': {
        bg: 'bg-slate-500/10',
        icon: 'text-slate-600 dark:text-slate-400',
        progress: '[&>div]:bg-slate-500/60',
        border: 'border-slate-500/40 hover:border-slate-500/60'
      }
    };
    return colorMap[name] || colorMap['General'];
  };

  return (
    <WidgetCard title="Checklist Items">
      <div className="space-y-5">
        {/* Overall Progress */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/20 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <span className="text-base font-bold text-foreground">Overall Progress</span>
            </div>
            <span className="text-3xl font-bold text-primary">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-4" />
        </div>

        {/* Category Progress */}
        <div className="space-y-3 pt-2 border-t-2 border-border/40">
          <div className="flex items-center gap-2 pt-1">
            <div className="h-1 w-1 rounded-full bg-muted-foreground/60" />
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Progress by Category
            </label>
          </div>
          <div className="space-y-3">
            {categoryProgress.map((category, index) => {
              const Icon = getCategoryIcon(category.name);
              const colors = getCategoryColors(category.name);
              return (
                <div
                  key={index}
                  className={`group p-3 rounded-lg border ${colors.border} hover:bg-accent/5 transition-all duration-300 cursor-pointer hover-scale`}
                  onClick={() => onCategoryClick?.(category.name)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                        <Icon className={`h-4 w-4 ${colors.icon} transition-transform duration-300 group-hover:rotate-12`} />
                      </div>
                      <span className="text-sm font-medium text-foreground transition-colors duration-300 group-hover:font-semibold">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {category.completed}/{category.total}
                      </span>
                      <span className={`text-sm font-semibold ${colors.icon} min-w-[3rem] text-right`}>
                        {category.percentage}%
                      </span>
                    </div>
                  </div>
                  <Progress value={category.percentage} className={`h-2 ${colors.progress} transition-all duration-300 group-hover:h-2.5`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
};
