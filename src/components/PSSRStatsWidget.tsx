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
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">PSSR Stats</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-amber-600">{stats.underReview}</p>
            <p className="text-xs text-muted-foreground">Review</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-600">{stats.draft}</p>
            <p className="text-xs text-muted-foreground">Draft</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PSSRStatsWidget;
