import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, GripVertical } from 'lucide-react';
import { StyledWidgetIcon } from './StyledWidgetIcon';

interface OwnersCostWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
}

export const OwnersCostWidget: React.FC<OwnersCostWidgetProps> = ({ projectId, dragAttributes, dragListeners }) => {
  // Mock data - replace with actual data fetching
  const costData = {
    budget: 5000000,
    actual: 3750000,
    committed: 4200000,
    variance: -450000,
    variancePercent: -9
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-amber-500/20 group">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2 opacity-0 group-hover/widget:opacity-100 transition-opacity" {...dragAttributes} {...dragListeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
        </div>
        <CardTitle className="text-lg flex items-center gap-3">
          <StyledWidgetIcon 
            Icon={DollarSign}
            gradientFrom="from-amber-500"
            gradientTo="to-yellow-500"
            glowFrom="from-amber-500/40"
            glowTo="to-yellow-500/40"
          />
          <span>Owners Cost</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Budget</div>
            <div className="text-lg font-bold">{formatCurrency(costData.budget)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Actual Spent</div>
            <div className="text-lg font-bold">{formatCurrency(costData.actual)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Committed</div>
            <div className="text-lg font-bold">{formatCurrency(costData.committed)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Variance</div>
            <div className="flex items-center gap-2">
              <div className={`text-lg font-bold ${costData.variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(Math.abs(costData.variance))}
              </div>
              {costData.variance < 0 ? (
                <TrendingUp className="h-4 w-4 text-red-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-emerald-600" />
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Budget Utilization</span>
            <Badge variant={costData.variancePercent < -10 ? 'destructive' : 'default'}>
              {Math.abs(costData.variancePercent)}% {costData.variance < 0 ? 'over' : 'under'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
