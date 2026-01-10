import React from 'react';
import { WidgetCard } from './WidgetCard';
import { Progress } from '@/components/ui/progress';
import { Settings, Shield, FileText, Users, AlertTriangle, BarChart3 } from 'lucide-react';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';
import { useLanguage } from '@/contexts/LanguageContext';

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
  dragAttributes?: any;
  dragListeners?: any;
}

export const PSSRProgressWidget: React.FC<PSSRProgressWidgetProps> = ({
  overallProgress,
  categoryProgress,
  onCategoryClick,
  dragAttributes,
  dragListeners,
}) => {
  const { widgetSize } = useWidgetSize();
  const { translations: t } = useLanguage();
  const widgetId = 'pssr-progress';
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
        bg: 'bg-blue-500/20 dark:bg-blue-500/30',
        icon: 'text-blue-600 dark:text-blue-400',
        progress: '[&>div]:bg-blue-500/50',
        border: 'border-blue-500/30 hover:border-blue-500/50'
      },
      'Process Safety': {
        bg: 'bg-orange-500/20 dark:bg-orange-500/30',
        icon: 'text-orange-600 dark:text-orange-400',
        progress: '[&>div]:bg-orange-500/50',
        border: 'border-orange-500/30 hover:border-orange-500/50'
      },
      'Documentation': {
        bg: 'bg-amber-500/20 dark:bg-amber-500/30',
        icon: 'text-amber-600 dark:text-amber-400',
        progress: '[&>div]:bg-amber-500/50',
        border: 'border-amber-500/30 hover:border-amber-500/50'
      },
      'Organization': {
        bg: 'bg-purple-500/20 dark:bg-purple-500/30',
        icon: 'text-purple-600 dark:text-purple-400',
        progress: '[&>div]:bg-purple-500/50',
        border: 'border-purple-500/30 hover:border-purple-500/50'
      },
      'Health & Safety': {
        bg: 'bg-teal-500/20 dark:bg-teal-500/30',
        icon: 'text-teal-600 dark:text-teal-400',
        progress: '[&>div]:bg-teal-500/50',
        border: 'border-teal-500/30 hover:border-teal-500/50'
      },
      'General': {
        bg: 'bg-slate-500/20 dark:bg-slate-500/30',
        icon: 'text-slate-600 dark:text-slate-400',
        progress: '[&>div]:bg-slate-500/50',
        border: 'border-slate-500/30 hover:border-slate-500/50'
      }
    };
    return colorMap[name] || colorMap['General'];
  };

  return (
    <WidgetCard 
      title={t.checklistItemsTitle || "Checklist Items"}
      className={`min-h-[280px] md:min-h-[300px] lg:min-h-[320px] ${
        widgetSize === 'compact' ? 'h-[280px] md:h-[300px] lg:h-[320px]' :
        widgetSize === 'standard' ? 'h-[350px] md:h-[380px] lg:h-[400px]' :
        'h-[450px] md:h-[500px] lg:h-[520px]'
      }`}
      widgetId={widgetId}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-5">
        {/* Overall Progress */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/20 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <span className="text-base font-bold text-foreground">{t.overallProgress || 'Overall Progress'}</span>
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
              {t.progressByCategory || 'Progress by Category'}
            </label>
          </div>
          <div className="space-y-3">
            {categoryProgress.map((category, index) => {
              const Icon = getCategoryIcon(category.name);
              const colors = getCategoryColors(category.name);
              return (
                <div
                  key={index}
                  className={`group p-3 rounded-lg border ${colors.border} hover:bg-accent/5 transition-all cursor-pointer`}
                  onClick={() => onCategoryClick?.(category.name)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center transition-colors`}>
                        <Icon className={`h-4 w-4 ${colors.icon}`} />
                      </div>
                      <span className="text-sm font-medium text-foreground">{category.name}</span>
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
                  <Progress value={category.percentage} className={`!h-1.5 ${colors.progress}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
};
