import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Layers, 
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  ListTodo
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useHandoverPointSystems } from '../hooks/useP2AHandoverPoints';
import { cn } from '@/lib/utils';

interface VCRSystemsTabProps {
  handoverPoint: P2AHandoverPoint;
}

interface P2ASystem {
  id: string;
  system_id: string;
  name: string;
  is_hydrocarbon: boolean;
  completion_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'RFO' | 'RFSU';
  completion_percentage: number;
  target_rfo_date?: string;
  target_rfsu_date?: string;
  actual_rfo_date?: string;
  actual_rfsu_date?: string;
  punchlist_a_count: number;
  punchlist_b_count: number;
  itr_a_count: number;
  itr_b_count: number;
  itr_total_count: number;
}

const getCompletionStatusConfig = (status: P2ASystem['completion_status']) => {
  switch (status) {
    case 'RFSU':
      return { label: 'RFSU', color: 'bg-emerald-500', textColor: 'text-emerald-500', icon: CheckCircle2 };
    case 'RFO':
      return { label: 'RFO', color: 'bg-blue-500', textColor: 'text-blue-500', icon: CheckCircle2 };
    case 'IN_PROGRESS':
      return { label: 'In Progress', color: 'bg-amber-500', textColor: 'text-amber-500', icon: Clock };
    default:
      return { label: 'Not Started', color: 'bg-slate-400', textColor: 'text-slate-500', icon: AlertCircle };
  }
};

export const VCRSystemsTab: React.FC<VCRSystemsTabProps> = ({ handoverPoint }) => {
  const { systems, isLoading } = useHandoverPointSystems(handoverPoint.id);
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());

  const toggleExpanded = (systemId: string) => {
    setExpandedSystems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(systemId)) {
        newSet.delete(systemId);
      } else {
        newSet.add(systemId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!systems.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Layers className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No Systems Assigned</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Drag systems from the panel on the left and drop them onto this VCR card to assign them.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate aggregated stats
  const totalSystems = systems.length;
  const rfoAchieved = systems.filter((s: P2ASystem) => s.completion_status === 'RFO' || s.completion_status === 'RFSU').length;
  const rfsuAchieved = systems.filter((s: P2ASystem) => s.completion_status === 'RFSU').length;
  const totalPunchlistA = systems.reduce((sum: number, s: P2ASystem) => sum + (s.punchlist_a_count || 0), 0);
  const totalPunchlistB = systems.reduce((sum: number, s: P2ASystem) => sum + (s.punchlist_b_count || 0), 0);
  const totalITRA = systems.reduce((sum: number, s: P2ASystem) => sum + (s.itr_a_count || 0), 0);
  const totalITRB = systems.reduce((sum: number, s: P2ASystem) => sum + (s.itr_b_count || 0), 0);

  return (
    <div className="space-y-4">
      {/* Aggregated Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-cyan-500">{totalSystems}</div>
            <div className="text-[10px] text-muted-foreground">Total Systems</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-blue-500">{rfoAchieved}/{totalSystems}</div>
            <div className="text-[10px] text-muted-foreground">RFO Achieved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-emerald-500">{rfsuAchieved}/{totalSystems}</div>
            <div className="text-[10px] text-muted-foreground">RFSU Achieved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-amber-500">{totalPunchlistA + totalPunchlistB}</div>
            <div className="text-[10px] text-muted-foreground">Outstanding Punchlists</div>
          </CardContent>
        </Card>
      </div>

      {/* Systems List */}
      <div className="space-y-2">
        {systems.map((system: P2ASystem) => {
          const statusConfig = getCompletionStatusConfig(system.completion_status);
          const StatusIcon = statusConfig.icon;
          const isExpanded = expandedSystems.has(system.id);
          const targetCert = system.is_hydrocarbon ? 'RFSU' : 'RFO';
          
          return (
            <Collapsible 
              key={system.id} 
              open={isExpanded}
              onOpenChange={() => toggleExpanded(system.id)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        statusConfig.color + '/20'
                      )}>
                        <StatusIcon className={cn("w-5 h-5", statusConfig.textColor)} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {system.system_id}
                          </Badge>
                          <Badge className={cn("text-[10px]", statusConfig.color)}>
                            {statusConfig.label}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            Target: {targetCert}
                          </Badge>
                        </div>
                        
                        <p className="text-sm font-medium text-foreground">{system.name}</p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Progress 
                            value={system.completion_percentage} 
                            className="h-1.5 flex-1 max-w-[200px]" 
                            indicatorClassName={statusConfig.color}
                          />
                          <span className="text-xs text-muted-foreground">
                            {system.completion_percentage}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-center">
                        <div>
                          <div className="text-sm font-bold text-red-500">{system.punchlist_a_count}</div>
                          <div className="text-[10px] text-muted-foreground">PL-A</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-amber-500">{system.punchlist_b_count}</div>
                          <div className="text-[10px] text-muted-foreground">PL-B</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-blue-500">{system.itr_a_count + system.itr_b_count}</div>
                          <div className="text-[10px] text-muted-foreground">ITRs</div>
                        </div>
                        <ChevronDown className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )} />
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                      {/* Show only applicable certificate based on system type */}
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {system.is_hydrocarbon ? 'RFSU' : 'RFO'} Status
                        </div>
                        <Badge className={cn(
                          "w-full justify-center",
                          system.is_hydrocarbon 
                            ? (system.actual_rfsu_date ? "bg-emerald-500" : "bg-slate-400")
                            : (system.actual_rfo_date ? "bg-emerald-500" : "bg-slate-400")
                        )}>
                          {system.is_hydrocarbon 
                            ? (system.actual_rfsu_date ? 'Achieved' : 'Pending')
                            : (system.actual_rfo_date ? 'Achieved' : 'Pending')
                          }
                        </Badge>
                      </div>
                      
                      {/* ITR Breakdown */}
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">ITR Breakdown</div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-blue-500 font-medium">A: {system.itr_a_count}</span>
                          <span className="text-muted-foreground">|</span>
                          <span className="text-amber-500 font-medium">B: {system.itr_b_count}</span>
                        </div>
                      </div>
                      
                      {/* Total Punchlist */}
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Punchlist Total</div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-red-500 font-medium">A: {system.punchlist_a_count}</span>
                          <span className="text-muted-foreground">|</span>
                          <span className="text-amber-500 font-medium">B: {system.punchlist_b_count}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm" className="w-full">
                      <ListTodo className="w-4 h-4 mr-2" />
                      View Punchlist Details
                    </Button>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};
