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
              return (
                <div
                  key={index}
                  className="group p-3 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-accent/5 transition-all cursor-pointer"
                  onClick={() => onCategoryClick?.(category.name)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {category.completed}/{category.total}
                      </span>
                      <span className="text-sm font-semibold text-primary min-w-[3rem] text-right">
                        {category.percentage}%
                      </span>
                    </div>
                  </div>
                  <Progress value={category.percentage} className="h-2 [&>div]:bg-muted-foreground/40" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
};
