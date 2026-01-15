import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingDown, TrendingUp, Calculator } from 'lucide-react';
import { useCostCategories, formatCurrency, getVarianceColorClass } from '@/hooks/useORACostData';
import { cn } from '@/lib/utils';

interface ORACostEditPanelProps {
  estimatedCost: number;
  actualCost: number;
  committedCost: number;
  costCategory: string | null;
  onEstimatedCostChange: (value: number) => void;
  onActualCostChange: (value: number) => void;
  onCommittedCostChange: (value: number) => void;
  onCostCategoryChange: (value: string) => void;
}

export const ORACostEditPanel: React.FC<ORACostEditPanelProps> = ({
  estimatedCost,
  actualCost,
  committedCost,
  costCategory,
  onEstimatedCostChange,
  onActualCostChange,
  onCommittedCostChange,
  onCostCategoryChange
}) => {
  const { data: categories } = useCostCategories();
  
  // Calculated values
  const costToGo = Math.max(0, estimatedCost - actualCost);
  const variance = estimatedCost - actualCost;
  const variancePercent = estimatedCost > 0 ? (variance / estimatedCost) * 100 : 0;
  const latestEstimate = actualCost + costToGo;

  return (
    <div className="space-y-6">
      {/* Cost Category */}
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4" />
          Cost Category
        </Label>
        <Select value={costCategory || ''} onValueChange={onCostCategoryChange}>
          <SelectTrigger className="border-border hover:border-primary/50 transition-colors">
            <SelectValue placeholder="Select category..." />
          </SelectTrigger>
          <SelectContent>
            {categories?.map(cat => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Categorize this cost for reporting and aggregation
        </p>
      </div>

      {/* Cost Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="mb-2 block">Estimated Cost</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              min="0"
              step="100"
              value={estimatedCost || ''}
              onChange={(e) => onEstimatedCostChange(Number(e.target.value) || 0)}
              placeholder="0"
              className="pl-7 border-border hover:border-primary/50 transition-colors"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Planned budget for this activity</p>
        </div>

        <div>
          <Label className="mb-2 block">Actual Cost</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              min="0"
              step="100"
              value={actualCost || ''}
              onChange={(e) => onActualCostChange(Number(e.target.value) || 0)}
              placeholder="0"
              className="pl-7 border-border hover:border-primary/50 transition-colors"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Amount already spent</p>
        </div>

        <div>
          <Label className="mb-2 block">Committed Cost</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              min="0"
              step="100"
              value={committedCost || ''}
              onChange={(e) => onCommittedCostChange(Number(e.target.value) || 0)}
              placeholder="0"
              className="pl-7 border-border hover:border-primary/50 transition-colors"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Committed but not yet spent</p>
        </div>
      </div>

      {/* Calculated Cost Metrics */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calculator className="w-4 h-4" />
          Calculated Metrics
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-background rounded-lg p-3 border">
            <p className="text-xs text-muted-foreground mb-1">Cost to Go</p>
            <p className="text-lg font-semibold">{formatCurrency(costToGo)}</p>
          </div>

          <div className="bg-background rounded-lg p-3 border">
            <p className="text-xs text-muted-foreground mb-1">Latest Estimate</p>
            <p className="text-lg font-semibold">{formatCurrency(latestEstimate)}</p>
          </div>

          <div className={cn(
            "rounded-lg p-3 border",
            variance >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
          )}>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              Variance
              {variance >= 0 ? (
                <TrendingDown className="w-3 h-3 text-emerald-600" />
              ) : (
                <TrendingUp className="w-3 h-3 text-red-600" />
              )}
            </p>
            <p className={cn(
              "text-lg font-semibold",
              variance >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
            )}>
              {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
            </p>
          </div>

          <div className={cn(
            "rounded-lg p-3 border",
            variancePercent >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
          )}>
            <p className="text-xs text-muted-foreground mb-1">Variance %</p>
            <p className={cn(
              "text-lg font-semibold",
              variancePercent >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
            )}>
              {variancePercent >= 0 ? '+' : ''}{variancePercent.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Budget Utilization Bar */}
      {estimatedCost > 0 && (
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Budget Utilization</span>
            <span className="font-medium">
              {Math.min(100, Math.round((actualCost / estimatedCost) * 100))}%
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                (actualCost / estimatedCost) <= 0.8 ? "bg-emerald-500" :
                (actualCost / estimatedCost) <= 1 ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${Math.min(100, (actualCost / estimatedCost) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$0</span>
            <span>{formatCurrency(estimatedCost)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
