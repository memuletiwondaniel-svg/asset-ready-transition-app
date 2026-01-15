import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronRight,
  Calendar,
  PieChart,
  BarChart3,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { useORAPlanCosts, formatCurrency, getVarianceColorClass, CategoryCostSummary, CostLineItem } from '@/hooks/useORACostData';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface ORAOwnersCostTabProps {
  oraPlanId: string;
}

// Color palette for categories
const CATEGORY_COLORS: Record<string, string> = {
  'Training': '#10b981',
  'CMMS': '#3b82f6',
  'Workshops': '#8b5cf6',
  'Documentation': '#f59e0b',
  'Consultancy': '#ec4899',
  'Equipment': '#06b6d4',
  'Travel': '#84cc16',
  'Personnel': '#f97316',
  'Spares': '#6366f1',
  'IT Systems': '#14b8a6',
  'Uncategorized': '#94a3b8'
};

export const ORAOwnersCostTab: React.FC<ORAOwnersCostTabProps> = ({ oraPlanId }) => {
  const { data: costData, isLoading } = useORAPlanCosts(oraPlanId);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [chartView, setChartView] = useState<'phasing' | 'variance' | 'breakdown'>('phasing');
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Get available years from phasing data
  const availableYears = useMemo(() => {
    if (!costData?.phasing) return [];
    const years = [...new Set(costData.phasing.map(p => p.year))].sort();
    return years;
  }, [costData?.phasing]);

  // Prepare phasing chart data
  const phasingChartData = useMemo(() => {
    if (!costData?.phasing) return [];
    
    // Group by period
    const periodMap = new Map<string, { period: string; total: number; [key: string]: any }>();
    
    costData.phasing
      .filter(p => yearFilter === 'all' || p.year.toString() === yearFilter)
      .forEach(p => {
        if (!periodMap.has(p.period)) {
          periodMap.set(p.period, { period: p.period, total: 0 });
        }
        const entry = periodMap.get(p.period)!;
        entry.total += p.amount;
        entry[p.category] = (entry[p.category] || 0) + p.amount;
      });
    
    return Array.from(periodMap.values());
  }, [costData?.phasing, yearFilter]);

  // Prepare pie chart data
  const pieChartData = useMemo(() => {
    if (!costData?.byCategory) return [];
    return costData.byCategory
      .filter(c => c.estimatedCost > 0)
      .map(c => ({
        name: c.category,
        value: c.estimatedCost,
        actual: c.actualCost,
        color: CATEGORY_COLORS[c.category] || CATEGORY_COLORS['Uncategorized']
      }));
  }, [costData?.byCategory]);

  // Prepare variance bar chart data
  const varianceChartData = useMemo(() => {
    if (!costData?.byCategory) return [];
    return costData.byCategory
      .filter(c => c.estimatedCost > 0)
      .map(c => ({
        category: c.category,
        estimated: c.estimatedCost,
        actual: c.actualCost,
        variance: c.variance,
        color: CATEGORY_COLORS[c.category] || CATEGORY_COLORS['Uncategorized']
      }));
  }, [costData?.byCategory]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const hasData = costData && (costData.totalEstimated > 0 || costData.totalActual > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Estimated Cost</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(costData?.totalEstimated || 0)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Total budget planned</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Actual Spent</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {formatCurrency(costData?.totalActual || 0)}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {costData?.totalEstimated ? Math.round((costData.totalActual / costData.totalEstimated) * 100) : 0}% of budget
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Cost to Go</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  {formatCurrency(costData?.totalCostToGo || 0)}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Remaining to complete</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-gradient-to-br border",
          (costData?.totalVariance || 0) >= 0
            ? "from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800"
            : "from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  (costData?.totalVariance || 0) >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                )}>
                  Variance
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  (costData?.totalVariance || 0) >= 0 ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"
                )}>
                  {formatCurrency(Math.abs(costData?.totalVariance || 0))}
                </p>
                <p className={cn(
                  "text-xs mt-1 flex items-center gap-1",
                  (costData?.totalVariance || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {(costData?.totalVariance || 0) >= 0 ? (
                    <>
                      <ArrowDownRight className="h-3 w-3" />
                      {Math.abs(costData?.variancePercent || 0).toFixed(1)}% under budget
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="h-3 w-3" />
                      {Math.abs(costData?.variancePercent || 0).toFixed(1)}% over budget
                    </>
                  )}
                </p>
              </div>
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center",
                (costData?.totalVariance || 0) >= 0 ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                {(costData?.totalVariance || 0) >= 0 ? (
                  <TrendingDown className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingUp className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations and Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Breakdown Table - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Cost Breakdown by Category
              </CardTitle>
              <Badge variant="secondary">
                {costData?.byCategory?.length || 0} categories
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!hasData ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No Cost Data Available</p>
                <p className="text-sm">Add costs to activities in the Activity Plan tab</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-4">Category</div>
                  <div className="col-span-2 text-right">Estimated</div>
                  <div className="col-span-2 text-right">Actual</div>
                  <div className="col-span-2 text-right">Cost to Go</div>
                  <div className="col-span-2 text-right">Variance</div>
                </div>
                
                {/* Category Rows */}
                {costData?.byCategory?.map((category) => (
                  <CategoryRow 
                    key={category.category}
                    category={category}
                    isExpanded={expandedCategories.has(category.category)}
                    onToggle={() => toggleCategory(category.category)}
                    color={CATEGORY_COLORS[category.category] || CATEGORY_COLORS['Uncategorized']}
                  />
                ))}

                {/* Total Row */}
                <div className="grid grid-cols-12 gap-2 px-3 py-3 text-sm font-semibold border-t-2 bg-muted/50 rounded-lg mt-4">
                  <div className="col-span-4">Total</div>
                  <div className="col-span-2 text-right">{formatCurrency(costData?.totalEstimated || 0)}</div>
                  <div className="col-span-2 text-right">{formatCurrency(costData?.totalActual || 0)}</div>
                  <div className="col-span-2 text-right">{formatCurrency(costData?.totalCostToGo || 0)}</div>
                  <div className={cn("col-span-2 text-right", getVarianceColorClass(costData?.totalVariance || 0, costData?.totalEstimated || 0))}>
                    {formatCurrency(costData?.totalVariance || 0)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Cost Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No cost data to display
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Phasing Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Cost Phasing Timeline
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Filter year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {phasingChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={phasingChartData}>
                <defs>
                  {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                    <linearGradient key={category} id={`color${category.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {costData?.byCategory?.map((cat) => (
                  <Area 
                    key={cat.category}
                    type="monotone" 
                    dataKey={cat.category} 
                    stackId="1"
                    stroke={CATEGORY_COLORS[cat.category] || CATEGORY_COLORS['Uncategorized']}
                    fill={`url(#color${cat.category.replace(/\s/g, '')})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No phasing data available</p>
                <p className="text-sm">Set target dates on activities to see cost phasing</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actual vs Planned Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Estimated vs Actual by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {varianceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={varianceChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  type="category"
                  dataKey="category" 
                  width={100}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="estimated" name="Estimated" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="actual" name="Actual" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No comparison data to display
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Sub-component for expandable category row
interface CategoryRowProps {
  category: CategoryCostSummary;
  isExpanded: boolean;
  onToggle: () => void;
  color: string;
}

const CategoryRow: React.FC<CategoryRowProps> = ({ category, isExpanded, onToggle, color }) => {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full">
        <div className="grid grid-cols-12 gap-2 px-3 py-3 text-sm hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
          <div className="col-span-4 flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-medium">{category.category}</span>
            <Badge variant="secondary" className="text-xs">{category.items.length}</Badge>
          </div>
          <div className="col-span-2 text-right font-medium">{formatCurrency(category.estimatedCost)}</div>
          <div className="col-span-2 text-right">{formatCurrency(category.actualCost)}</div>
          <div className="col-span-2 text-right text-muted-foreground">{formatCurrency(category.costToGo)}</div>
          <div className={cn("col-span-2 text-right font-medium", getVarianceColorClass(category.variance, category.estimatedCost))}>
            {category.variance >= 0 ? '+' : ''}{formatCurrency(category.variance)}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-12 pr-3 pb-2 space-y-1">
          {category.items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 py-2 text-sm text-muted-foreground border-l-2 border-muted pl-4">
              <div className="col-span-4 flex items-center gap-2">
                <span className="truncate">{item.name}</span>
                {item.targetDate && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    ({format(parseISO(item.targetDate), 'MMM yyyy')})
                  </span>
                )}
              </div>
              <div className="col-span-2 text-right">{formatCurrency(item.estimatedCost)}</div>
              <div className="col-span-2 text-right">{formatCurrency(item.actualCost)}</div>
              <div className="col-span-2 text-right">{formatCurrency(Math.max(0, item.estimatedCost - item.actualCost))}</div>
              <div className={cn("col-span-2 text-right", getVarianceColorClass(item.estimatedCost - item.actualCost, item.estimatedCost))}>
                {(item.estimatedCost - item.actualCost) >= 0 ? '+' : ''}{formatCurrency(item.estimatedCost - item.actualCost)}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
