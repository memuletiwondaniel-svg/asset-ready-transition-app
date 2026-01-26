import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  ListTodo,
  Flame,
  Snowflake
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

// Circular Progress Wheel Component
const CircularProgressWheel: React.FC<{ percentage: number; size?: number }> = ({ 
  percentage, 
  size = 56 
}) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  const getProgressColor = () => {
    if (percentage >= 70) return '#10b981'; // emerald-500
    if (percentage >= 40) return '#f59e0b'; // amber-500
    return '#f97316'; // orange-500
  };

  const getProgressColorEnd = () => {
    if (percentage >= 70) return '#34d399'; // emerald-400
    if (percentage >= 40) return '#fbbf24'; // amber-400
    return '#fb923c'; // orange-400
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id={`sysProgressGradient-${percentage}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={getProgressColor()} />
            <stop offset="100%" stopColor={getProgressColorEnd()} />
          </linearGradient>
        </defs>
        <circle
          className="stroke-muted/20"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={`url(#sysProgressGradient-${percentage})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-700 ease-out"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold">{percentage}%</span>
      </div>
    </div>
  );
};

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
  const hydrocarbonSystems = systems.filter((s: P2ASystem) => s.is_hydrocarbon);
  const nonHydrocarbonSystems = systems.filter((s: P2ASystem) => !s.is_hydrocarbon);
  const hasHydrocarbon = hydrocarbonSystems.length > 0;
  const hasNonHydrocarbon = nonHydrocarbonSystems.length > 0;
  
  // RFO count: non-HC systems that have achieved RFO (or RFSU)
  const rfoAchieved = nonHydrocarbonSystems.filter((s: P2ASystem) => 
    s.completion_status === 'RFO' || s.completion_status === 'RFSU'
  ).length;
  // RFSU count: HC systems that have achieved RFSU
  const rfsuAchieved = hydrocarbonSystems.filter((s: P2ASystem) => 
    s.completion_status === 'RFSU'
  ).length;
  
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
        {hasNonHydrocarbon && (
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-blue-500">{rfoAchieved}/{nonHydrocarbonSystems.length}</div>
              <div className="text-[10px] text-muted-foreground">RFO Achieved</div>
            </CardContent>
          </Card>
        )}
        {hasHydrocarbon && (
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-emerald-500">{rfsuAchieved}/{hydrocarbonSystems.length}</div>
              <div className="text-[10px] text-muted-foreground">RFSU Achieved</div>
            </CardContent>
          </Card>
        )}
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
                    <div className="flex items-center gap-6">
                      {/* Circular Progress Wheel */}
                      <CircularProgressWheel percentage={system.completion_percentage} size={56} />
                      
                      {/* System Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            {system.system_id}
                          </span>
                          {system.completion_status !== 'NOT_STARTED' && (
                            <Badge className={cn("text-[10px]", statusConfig.color)}>
                              {statusConfig.label}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm font-medium text-foreground">{system.name}</p>
                        
                        {/* Hydrocarbon Indicator */}
                        {system.is_hydrocarbon && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span className="text-xs text-muted-foreground">Hydrocarbon</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Stats - Outstanding counts */}
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-[9px] text-muted-foreground/70 uppercase tracking-wide">Outstanding</div>
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
                        </div>
                      </div>
                      <div className="ml-4">
                        <Badge className={cn(
                          "text-[10px] px-2",
                          system.is_hydrocarbon 
                            ? (system.actual_rfsu_date ? "bg-emerald-500" : "bg-slate-400")
                            : (system.actual_rfo_date ? "bg-emerald-500" : "bg-slate-400")
                        )}>
                          {targetCert}
                        </Badge>
                      </div>
                      <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180"
                      )} />
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
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => toast.info('Punchlist details coming soon', {
                        description: `View detailed punchlist for ${system.name}`
                      })}
                    >
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
