import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Database, 
  Calendar, 
  Package, 
  Shield, 
  Boxes, 
  ChevronDown, 
  ChevronRight,
  Wrench,
  Target,
  TrendingUp
} from 'lucide-react';
import { useORAMaintenanceBatches, ORAMaintenanceBatch } from '@/hooks/useORATrainingPlan';
import { format } from 'date-fns';

interface ORAMaintenanceReadinessTabProps {
  oraPlanId: string;
}

// Component configuration with icons
const MAINTENANCE_COMPONENTS = [
  {
    key: 'ARB' as const,
    label: 'ARB - Asset Register Build',
    icon: Database,
    description: 'Asset data population and validation'
  },
  {
    key: 'PMS' as const,
    label: 'PMs - Preventive Maintenance Routines',
    icon: Calendar,
    description: 'PM schedules and task creation'
  },
  {
    key: 'BOM' as const,
    label: 'BOM - Bill of Materials',
    icon: Package,
    description: 'Spare parts and materials setup'
  },
  {
    key: 'IMS' as const,
    label: 'IMS - Integrity Management System',
    icon: Shield,
    description: 'Integrity workflows and inspections'
  },
  {
    key: '2Y_SPARES' as const,
    label: '2Y Operating Spares',
    icon: Boxes,
    description: 'Two-year operating spares procurement'
  }
];

const STATUSES = [
  { value: 'NOT_STARTED', label: 'Not Started', color: 'bg-muted text-muted-foreground' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500 text-white' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-500 text-white' },
  { value: 'ON_HOLD', label: 'On Hold', color: 'bg-amber-500 text-white' }
];

export const ORAMaintenanceReadinessTab: React.FC<ORAMaintenanceReadinessTabProps> = ({ oraPlanId }) => {
  const [expandedComponents, setExpandedComponents] = useState<Record<string, boolean>>({
    ARB: true, // Default expand first one
    PMS: false,
    BOM: false,
    IMS: false,
    '2Y_SPARES': false
  });

  const { batches, batchesByComponent, componentSummaries, isLoading } = useORAMaintenanceBatches(oraPlanId);

  const toggleComponent = (key: string) => {
    setExpandedComponents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUSES.find(s => s.value === status) || STATUSES[0];
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-amber-500';
    return 'bg-muted';
  };

  // Calculate overall stats
  const totalBatches = batches?.length || 0;
  const completedBatches = batches?.filter(b => b.status === 'COMPLETED').length || 0;
  const overallProgress = totalBatches > 0 
    ? Math.round(batches!.reduce((sum, b) => sum + b.progress_percent, 0) / totalBatches)
    : 0;

  // Find latest target date across all batches
  const latestTargetDate = batches
    ?.filter(b => b.target_date)
    .sort((a, b) => new Date(b.target_date!).getTime() - new Date(a.target_date!).getTime())[0]?.target_date;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          OR Maintenance Readiness
        </h2>
        <p className="text-sm text-muted-foreground">
          Track CMMS data readiness progress (Read-only view managed by CMMS Lead)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Database className="w-4 h-4" />
              Components
            </div>
            <div className="text-2xl font-bold">{MAINTENANCE_COMPONENTS.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              Avg Progress
            </div>
            <div className="text-2xl font-bold text-primary">{overallProgress}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Package className="w-4 h-4" />
              Batches Complete
            </div>
            <div className="text-2xl font-bold text-green-600">
              {completedBatches} / {totalBatches}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              Overall Target
            </div>
            <div className="text-2xl font-bold">
              {latestTargetDate ? format(new Date(latestTargetDate), 'MMM yyyy') : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expandable Components */}
      <div className="space-y-3">
        {MAINTENANCE_COMPONENTS.map((component) => {
          const Icon = component.icon;
          const componentBatches = batchesByComponent[component.key] || [];
          const summary = componentSummaries[component.key] || { 
            progress: 0, 
            targetDate: null, 
            batchCount: 0, 
            completedBatches: 0 
          };
          const isExpanded = expandedComponents[component.key];

          return (
            <Collapsible 
              key={component.key} 
              open={isExpanded}
              onOpenChange={() => toggleComponent(component.key)}
            >
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <span className="font-semibold">{component.label}</span>
                          <p className="text-xs text-muted-foreground">{component.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        {/* Batch count */}
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Batches</div>
                          <div className="font-medium">
                            {summary.completedBatches}/{summary.batchCount}
                          </div>
                        </div>

                        {/* Target Date */}
                        <div className="text-right min-w-[100px]">
                          <div className="text-xs text-muted-foreground">Target</div>
                          <div className="font-medium">
                            {summary.targetDate 
                              ? format(new Date(summary.targetDate), 'MMM d, yyyy')
                              : '—'
                            }
                          </div>
                        </div>
                        
                        {/* Progress */}
                        <div className="w-40 flex items-center gap-3">
                          <Progress 
                            value={summary.progress} 
                            className="h-2 flex-1"
                          />
                          <span className="text-sm font-medium min-w-[36px] text-right">
                            {summary.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="ml-8 mt-2 border rounded-lg overflow-hidden bg-card">
                  {componentBatches.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-[120px]">Batch</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[180px]">Progress</TableHead>
                          <TableHead className="w-[130px]">Target Date</TableHead>
                          <TableHead className="w-[110px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {componentBatches.map((batch) => (
                          <TableRow key={batch.id}>
                            <TableCell className="font-medium">
                              {batch.batch_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {batch.description}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={batch.progress_percent} 
                                  className="h-2 flex-1"
                                />
                                <span className="text-sm min-w-[36px] text-right">
                                  {batch.progress_percent}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {batch.target_date 
                                ? format(new Date(batch.target_date), 'MMM d, yyyy')
                                : '—'
                              }
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(batch.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Boxes className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No batches defined for this component</p>
                      <p className="text-xs mt-1">Batches are managed by the CMMS Lead</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="text-xs text-muted-foreground text-center pt-4 border-t">
        This is a read-only view. OR Maintenance data is managed by the CMMS Lead / OR Maintenance Lead.
      </div>
    </div>
  );
};
