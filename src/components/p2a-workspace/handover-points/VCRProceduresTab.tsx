import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  User, 
  Calendar,
  ChevronRight,
  Rocket,
  Settings,
  Search,
  CheckCircle2,
  CircleDot,
  Circle,
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useVCRProcedureDeliverables, VCRProcedureDeliverable } from '../hooks/useVCRDeliverables';
import { ExecutionPlanGate } from './ExecutionPlanGate';
import { cn } from '@/lib/utils';

interface VCRProceduresTabProps {
  handoverPoint: P2AHandoverPoint;
}

type ProcedureFilter = 'all' | 'startup' | 'operating';

const ORA_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  'NOT_STARTED': { label: 'Not Started', icon: Circle, className: 'text-muted-foreground' },
  'IN_PROGRESS': { label: 'In Progress', icon: CircleDot, className: 'text-amber-500' },
  'COMPLETED': { label: 'Completed', icon: CheckCircle2, className: 'text-emerald-500' },
};

export const VCRProceduresTab: React.FC<VCRProceduresTabProps> = ({ handoverPoint }) => {
  const executionPlanStatus = handoverPoint.execution_plan_status || 'DRAFT';
  const { data: procedures, isLoading } = useVCRProcedureDeliverables(handoverPoint.id);
  const items = procedures || [];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProcedureFilter>('all');

  const filteredItems = useMemo(() => {
    return items.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || p.procedure_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [items, searchQuery, typeFilter]);

  const startupItems = filteredItems.filter(p => p.procedure_type === 'startup');
  const operatingItems = filteredItems.filter(p => p.procedure_type === 'operating');
  const completedCount = items.filter(i => i.ora.ora_status === 'COMPLETED').length;
  const overallProgress = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + i.ora.ora_completion_percentage, 0) / items.length)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <ExecutionPlanGate
      executionPlanStatus={executionPlanStatus}
      deliverableType="Procedures"
    >
      <div className="space-y-4">
        {/* Header with Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-emerald-500">{items.length}</div>
              <div className="text-[10px] text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-orange-500">
                {items.filter(p => p.procedure_type === 'startup').length}
              </div>
              <div className="text-[10px] text-muted-foreground">Start-up</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-blue-500">
                {items.filter(p => p.procedure_type === 'operating').length}
              </div>
              <div className="text-[10px] text-muted-foreground">Operating</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-green-500">{completedCount}</div>
              <div className="text-[10px] text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          {items.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <Progress value={overallProgress} className="h-1.5 w-20" />
              <span className="text-xs text-muted-foreground">{overallProgress}%</span>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search procedures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as ProcedureFilter)}>
              <TabsList className="grid grid-cols-3 w-auto">
                <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
                <TabsTrigger value="startup" className="text-xs px-3 gap-1">
                  <Rocket className="w-3 h-3" />
                  Start-up
                </TabsTrigger>
                <TabsTrigger value="operating" className="text-xs px-3 gap-1">
                  <Settings className="w-3 h-3" />
                  Normal
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Procedures List */}
        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="font-medium text-lg">No Procedures Planned</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
                No procedures were defined in the VCR Plan for this VCR.
              </p>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No procedures match your search</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-4">
              {typeFilter === 'all' ? (
                <>
                  {startupItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Rocket className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">Initial Start-up Procedures</span>
                        <Badge variant="outline" className="text-[10px]">{startupItems.length}</Badge>
                      </div>
                      <div className="space-y-2 pl-6">
                        {startupItems.map((p) => (
                          <ProcedureDeliverableCard key={p.id} item={p} />
                        ))}
                      </div>
                    </div>
                  )}
                  {operatingItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Normal Operating Procedures</span>
                        <Badge variant="outline" className="text-[10px]">{operatingItems.length}</Badge>
                      </div>
                      <div className="space-y-2 pl-6">
                        {operatingItems.map((p) => (
                          <ProcedureDeliverableCard key={p.id} item={p} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((p) => (
                    <ProcedureDeliverableCard key={p.id} item={p} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </ExecutionPlanGate>
  );
};

// Procedure Deliverable Card
const ProcedureDeliverableCard: React.FC<{ item: VCRProcedureDeliverable }> = ({ item }) => {
  const oraConfig = ORA_STATUS_CONFIG[item.ora.ora_status] || ORA_STATUS_CONFIG['NOT_STARTED'];
  const StatusIcon = oraConfig.icon;

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {item.procedure_type === 'startup' ? (
                <Rocket className="w-4 h-4 text-orange-500 shrink-0" />
              ) : (
                <Settings className="w-4 h-4 text-blue-500 shrink-0" />
              )}
              <h4 className="font-medium text-sm truncate">{item.title}</h4>
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1 pl-6">{item.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-[10px] pl-6">
              {item.responsible_person && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <User className="w-3 h-3" />
                  {item.responsible_person}
                </span>
              )}
              {item.target_date && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {item.target_date}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn('gap-1 text-[10px]', oraConfig.className)}
            >
              <StatusIcon className="w-3 h-3" />
              {oraConfig.label}
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
