import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, CheckCircle, Clock, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface PSSRStatsWidgetProps {
  stats: {
    total: number;
    approved: number;
    underReview: number;
    draft: number;
    criticalIssues: number;
    avgProgress: number;
  };
}

const PSSRStatsWidget: React.FC<PSSRStatsWidgetProps> = ({ stats }) => {
  return (
    <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            PSSR Statistics
          </CardTitle>
          <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
            {stats.total}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Overview of all Pre-Start-Up Safety Reviews</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Approved */}
          <div className="group relative overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 hover:bg-emerald-500/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span className="text-2xl font-bold text-emerald-600">{stats.approved}</span>
            </div>
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Approved</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% of total
            </p>
          </div>

          {/* Under Review */}
          <div className="group relative overflow-hidden rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 hover:bg-amber-500/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold text-amber-600">{stats.underReview}</span>
            </div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Under Review</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stats.total > 0 ? Math.round((stats.underReview / stats.total) * 100) : 0}% of total
            </p>
          </div>

          {/* Draft */}
          <div className="group relative overflow-hidden rounded-lg border border-slate-500/20 bg-slate-500/5 p-4 hover:bg-slate-500/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-slate-600" />
              <span className="text-2xl font-bold text-slate-600">{stats.draft}</span>
            </div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-400">Draft</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stats.total > 0 ? Math.round((stats.draft / stats.total) * 100) : 0}% of total
            </p>
          </div>

          {/* Average Progress */}
          <div className="group relative overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-primary">{stats.avgProgress}%</span>
            </div>
            <p className="text-xs font-medium text-primary">Avg Progress</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Across all PSSRs
            </p>
          </div>
        </div>

        {/* Critical Issues Alert */}
        {stats.criticalIssues > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {stats.criticalIssues} Critical {stats.criticalIssues === 1 ? 'Issue' : 'Issues'} Require Attention
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PSSRStatsWidget;
