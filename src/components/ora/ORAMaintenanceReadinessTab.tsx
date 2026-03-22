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
  TrendingUp,
  FileText
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
    description: 'Asset data population and validation',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100'
  },
  {
    key: 'PMS' as const,
    label: 'PMs - Preventive Maintenance Routines',
    icon: Calendar,
    description: 'PM schedules and task creation',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100'
  },
  {
    key: 'IMS' as const,
    label: 'IMS - Integrity Management System',
    icon: Shield,
    description: 'Integrity workflows and inspections',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100'
  },
  {
    key: 'BOM' as const,
    label: 'BOMs - Bill of Materials',
    icon: Package,
    description: 'Spare parts and materials setup',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100'
  },
  {
    key: '2Y_SPARES' as const,
    label: '2Y Operating Spares',
    icon: Boxes,
    description: 'Two-year operating spares procurement',
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-100'
  }
];

const STATUSES = [
  { value: 'NOT_STARTED', label: 'Not Started', color: 'bg-muted text-muted-foreground' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-100 text-amber-700 border border-amber-300' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-500 text-white' },
  { value: 'ON_HOLD', label: 'On Hold', color: 'bg-red-100 text-red-700 border border-red-300' }
];

// Mock progress narratives entered by CMMS Lead
const MOCK_COMPONENT_NARRATIVES: Record<string, {
  lastUpdated: string;
  updatedBy: string;
  narrative: string;
}> = {
  ARB: {
    lastUpdated: '2024-01-08',
    updatedBy: 'Ahmed Hassan (CMMS Lead)',
    narrative: 'Asset Register Build is progressing well. Batch 1 (Critical Equipment) has been completed with all 847 assets validated. Batch 2 is currently in progress with 65% of rotating equipment entered. We are on track to complete ARB by end of Q1. Key risk: awaiting final P&ID revisions for static equipment classification.'
  },
  PMS: {
    lastUpdated: '2024-01-07',
    updatedBy: 'Ahmed Hassan (CMMS Lead)',
    narrative: 'Preventive Maintenance routines setup is underway. We have completed PM strategies for all critical rotating equipment. Currently working on developing task lists for electrical systems. Vendor maintenance manuals for new compressor packages have been received and are being reviewed.'
  },
  BOM: {
    lastUpdated: '2024-01-05',
    updatedBy: 'Materials Lead',
    narrative: 'Bill of Materials population is approximately 40% complete. Initial spare parts lists have been uploaded for major equipment. Currently coordinating with vendors to obtain recommended spare parts lists for specialized equipment. Long-lead items have been identified and procurement process initiated.'
  },
  IMS: {
    lastUpdated: '2024-01-06',
    updatedBy: 'Ahmed Hassan (CMMS Lead)',
    narrative: 'Integrity Management System setup has commenced. RBI study results are being integrated into CMMS. Inspection points for pressure vessels and piping have been defined. Awaiting final corrosion loop definitions from the Integrity team.'
  },
  '2Y_SPARES': {
    lastUpdated: '2024-01-04',
    updatedBy: 'Materials Lead',
    narrative: 'Two-year operating spares procurement is in planning phase. Initial spares list has been compiled based on equipment criticality analysis. Working with Operations to validate consumption estimates. Budget allocation confirmed for Phase 1 items.'
  }
};

// Mock responsible engineers by component
const MOCK_RESPONSIBLE_ENGINEERS: Record<string, string[]> = {
  ARB: ['Mushtaq Nawaz', 'Ben Chiong'],
  PMS: ['Ben Chiong', 'Mushtaq Nawaz'],
  IMS: ['Mushtaq Nawaz', 'Ben Chiong'],
  BOM: ['Poojan Joshi', 'Maharsh Seth'],
  '2Y_SPARES': ['Maharsh Seth', 'Poojan Joshi']
};

// Helper to get responsible engineer for a batch
const getResponsibleEngineer = (componentKey: string, batchIndex: number): string => {
  const engineers = MOCK_RESPONSIBLE_ENGINEERS[componentKey] || ['Unassigned'];
  return engineers[batchIndex % engineers.length];
};

export const ORAMaintenanceReadinessTab: React.FC<ORAMaintenanceReadinessTabProps> = ({ oraPlanId }) => {
  const [expandedComponents, setExpandedComponents] = useState<Record<string, boolean>>({
    ARB: false,
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
      <Badge className={`${statusInfo.color} whitespace-nowrap`}>
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
                        <div className={`p-2 rounded-lg ${component.iconBg}`}>
                          <Icon className={`w-5 h-5 ${component.iconColor}`} />
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
                            {summary.progress === 100 
                              ? '—'
                              : summary.targetDate 
                                ? format(new Date(summary.targetDate), 'MMM d, yyyy')
                                : '—'
                            }
                          </div>
                        </div>
                        
                        {/* Progress */}
                        <div className="w-40 flex items-center gap-3">
                          <Progress 
                            value={summary.progress} 
                            className={`h-2 flex-1 ${summary.progress === 100 ? '[&>div]:bg-green-500' : '[&>div]:bg-slate-300'}`}
                          />
                          <span className={`text-sm font-medium min-w-[36px] text-right ${summary.progress === 100 ? 'text-green-600' : ''}`}>
                            {summary.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="ml-8 mt-2 space-y-3">
                  {/* Progress Narrative */}
                  {MOCK_COMPONENT_NARRATIVES[component.key] && (
                    <Card className="bg-muted/20 border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Progress Narrative</span>
                              <span className="text-xs text-muted-foreground">
                                Updated {format(new Date(MOCK_COMPONENT_NARRATIVES[component.key].lastUpdated), 'MMM d, yyyy')} by {MOCK_COMPONENT_NARRATIVES[component.key].updatedBy}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {MOCK_COMPONENT_NARRATIVES[component.key].narrative}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Batches Table */}
                  <div className="border rounded-lg max-h-[60vh] overflow-auto bg-card">
                  {componentBatches.length > 0 ? (
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-[120px]">Batch</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[150px]">Responsible</TableHead>
                          <TableHead className="w-[180px]">Progress</TableHead>
                          <TableHead className="w-[130px]">Target Date</TableHead>
                          <TableHead className="w-[110px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {componentBatches.map((batch, batchIndex) => (
                          <TableRow key={batch.id}>
                            <TableCell className="font-medium">
                              {batch.batch_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {batch.description}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getResponsibleEngineer(component.key, batchIndex)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={batch.progress_percent} 
                                  className={`h-2 flex-1 ${batch.progress_percent === 100 ? '[&>div]:bg-green-500' : '[&>div]:bg-slate-300'}`}
                                />
                                <span className={`text-sm min-w-[36px] text-right ${batch.progress_percent === 100 ? 'text-green-600' : ''}`}>
                                  {batch.progress_percent}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {batch.status === 'COMPLETED'
                                ? '—'
                                : batch.target_date 
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
