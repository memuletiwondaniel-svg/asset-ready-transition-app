import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';

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
    <div>
      <div className="flex flex-col items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">PSSR Statistics</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="space-y-1 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="space-y-1 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.underReview}</p>
          <p className="text-xs text-muted-foreground">Review</p>
        </div>
        <div className="space-y-1 text-center">
          <p className="text-2xl font-bold text-slate-600">{stats.draft}</p>
          <p className="text-xs text-muted-foreground">Draft</p>
        </div>
      </div>
    </div>
  );
};

export default PSSRStatsWidget;
