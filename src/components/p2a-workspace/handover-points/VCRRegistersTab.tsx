import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Search,
  ChevronRight,
  Calendar,
  User,
  ClipboardList,
  CheckCircle2,
  CircleDot,
  Circle,
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useVCRRegisterDeliverables, VCRRegisterDeliverable } from '../hooks/useVCRDeliverables';
import { ExecutionPlanGate } from './ExecutionPlanGate';
import { cn } from '@/lib/utils';

interface VCRRegistersTabProps {
  handoverPoint: P2AHandoverPoint;
}

const ORA_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  'NOT_STARTED': { label: 'Not Started', icon: Circle, className: 'text-muted-foreground' },
  'IN_PROGRESS': { label: 'In Progress', icon: CircleDot, className: 'text-amber-500' },
  'COMPLETED': { label: 'Completed', icon: CheckCircle2, className: 'text-emerald-500' },
};

export const VCRRegistersTab: React.FC<VCRRegistersTabProps> = ({ handoverPoint }) => {
  const executionPlanStatus = handoverPoint.execution_plan_status || 'DRAFT';
  const { data: registers, isLoading } = useVCRRegisterDeliverables(handoverPoint.id);
  const items = registers || [];
  const [searchQuery, setSearchQuery] = useState('');

  const completedCount = items.filter(i => i.ora.ora_status === 'COMPLETED').length;
  const overallProgress = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + i.ora.ora_completion_percentage, 0) / items.length)
    : 0;

  const filteredItems = items.filter(r =>
    searchQuery === '' ||
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      deliverableType="Operational Registers"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-primary">{items.length}</div>
                <div className="text-[10px] text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-emerald-500">{completedCount}</div>
                <div className="text-[10px] text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Progress value={overallProgress} className="h-1.5 w-20" />
              <span className="text-xs text-muted-foreground">{overallProgress}%</span>
            </div>
          )}
        </div>

        {/* Search */}
        {items.length > 5 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search registers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-medium text-lg">No Registers Planned</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
                No operational registers were defined in the VCR Plan for this VCR.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-2">
              {filteredItems.map((register) => (
                <RegisterDeliverableCard key={register.id} item={register} />
              ))}
              {filteredItems.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">No registers match your search</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </ExecutionPlanGate>
  );
};

// Register Card
const RegisterDeliverableCard: React.FC<{ item: VCRRegisterDeliverable }> = ({ item }) => {
  const oraConfig = ORA_STATUS_CONFIG[item.ora.ora_status] || ORA_STATUS_CONFIG['NOT_STARTED'];
  const StatusIcon = oraConfig.icon;

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary shrink-0" />
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
