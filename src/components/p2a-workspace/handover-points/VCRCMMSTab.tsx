import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronRight, 
  Database, 
  CalendarClock, 
  Shield, 
  Package,
  TrendingUp,
  Layers,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';

interface VCRCMMSTabProps {
  handoverPoint: P2AHandoverPoint;
}

interface CMMSComponent {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  batches: { completed: number; total: number };
  targetDate: string | null;
  progress: number;
}

const CMMS_COMPONENTS: CMMSComponent[] = [
  {
    id: 'arb',
    code: 'ARB',
    name: 'Asset Register Build',
    description: 'Asset data population and validation',
    icon: Database,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    batches: { completed: 0, total: 0 },
    targetDate: null,
    progress: 0,
  },
  {
    id: 'pms',
    code: 'PMs',
    name: 'Preventive Maintenance Routines',
    description: 'PM schedules and task creation',
    icon: CalendarClock,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    batches: { completed: 0, total: 0 },
    targetDate: null,
    progress: 0,
  },
  {
    id: 'ims',
    code: 'IMS',
    name: 'Integrity Management System',
    description: 'Integrity workflows and inspections',
    icon: Shield,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    batches: { completed: 0, total: 0 },
    targetDate: null,
    progress: 0,
  },
  {
    id: 'bom',
    code: 'BOMs',
    name: 'Bill of Materials',
    description: 'Spare parts and materials setup',
    icon: Package,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    batches: { completed: 0, total: 0 },
    targetDate: null,
    progress: 0,
  },
];

export const VCRCMMSTab: React.FC<VCRCMMSTabProps> = ({ handoverPoint }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const components = CMMS_COMPONENTS;
  const avgProgress = components.length > 0
    ? Math.round(components.reduce((sum, c) => sum + c.progress, 0) / components.length)
    : 0;
  const totalBatchesCompleted = components.reduce((sum, c) => sum + c.batches.completed, 0);
  const totalBatchesAll = components.reduce((sum, c) => sum + c.batches.total, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-rose-500" />
          OR Maintenance Readiness
        </h2>
        <p className="text-sm text-muted-foreground">
          Track CMMS data readiness progress (Read-only view managed by CMMS Lead)
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] mb-1">
              <Database className="w-3.5 h-3.5" />
              Components
            </div>
            <div className="text-xl font-bold text-foreground">{components.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Avg Progress
            </div>
            <div className="text-xl font-bold text-emerald-500">{avgProgress}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] mb-1">
              <Layers className="w-3.5 h-3.5" />
              Batches Complete
            </div>
            <div className="text-xl font-bold text-blue-500">
              {totalBatchesCompleted} / {totalBatchesAll}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] mb-1">
              <Target className="w-3.5 h-3.5" />
              Overall Target
            </div>
            <div className="text-xl font-bold text-muted-foreground">—</div>
          </CardContent>
        </Card>
      </div>

      {/* Component Cards */}
      <div className="space-y-2">
        {components.map((comp) => {
          const Icon = comp.icon;
          const isExpanded = expandedId === comp.id;

          return (
            <Card
              key={comp.id}
              className="transition-all hover:shadow-sm cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : comp.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <ChevronRight className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                    isExpanded && "rotate-90"
                  )} />
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", comp.bgColor)}>
                    <Icon className={cn("w-5 h-5", comp.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {comp.code} - {comp.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{comp.description}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 shrink-0 text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Batches</div>
                      <div className="text-sm font-semibold text-foreground">
                        {comp.batches.completed}/{comp.batches.total}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Target</div>
                      <div className="text-sm font-semibold text-muted-foreground">
                        {comp.targetDate || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-24">
                    <Progress value={comp.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium text-muted-foreground w-8 text-right">{comp.progress}%</span>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 ml-14 pl-4 border-l-2 border-border space-y-3">
                    <div className="text-xs text-muted-foreground italic">
                      No batches defined for this component. Batches are managed by the CMMS Lead.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center pt-4 border-t">
        This is a read-only view. OR Maintenance data is managed by the CMMS Lead / OR Maintenance Lead.
      </div>
    </div>
  );
};
