import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Layers, 
  ChevronRight,
  Flame,
  Snowflake,
  Plus,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useHandoverPointSystems } from '../hooks/useP2AHandoverPoints';
import { cn } from '@/lib/utils';
import { AddSystemSheet } from './AddSystemSheet';

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

// Compact circular progress
const MiniProgress: React.FC<{ percentage: number; size?: number }> = ({ percentage, size = 40 }) => {
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const color = percentage >= 70 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#94a3b8';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="stroke-muted/20"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-500 ease-out"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-semibold text-foreground">{percentage}%</span>
      </div>
    </div>
  );
};

const getStatusBadge = (status: P2ASystem['completion_status'], isHC: boolean) => {
  const targetCert = isHC ? 'RFSU' : 'RFO';
  switch (status) {
    case 'RFSU':
      return <Badge className="bg-emerald-500 text-[9px] px-1.5">RFSU</Badge>;
    case 'RFO':
      return <Badge className="bg-blue-500 text-[9px] px-1.5">RFO</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="outline" className="text-[9px] px-1.5 text-amber-500 border-amber-500/40">In Progress</Badge>;
    default:
      return <Badge variant="outline" className="text-[9px] px-1.5 text-muted-foreground">{targetCert}</Badge>;
  }
};

type ViewMode = 'list' | 'grid';

export const VCRSystemsTab: React.FC<VCRSystemsTabProps> = ({ handoverPoint }) => {
  const { systems, isLoading } = useHandoverPointSystems(handoverPoint.id);
  const [addSystemOpen, setAddSystemOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const filteredSystems = useMemo(() => {
    if (!searchQuery) return systems;
    const q = searchQuery.toLowerCase();
    return systems.filter((s: P2ASystem) =>
      s.name.toLowerCase().includes(q) || s.system_id.toLowerCase().includes(q)
    );
  }, [systems, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
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

  // Aggregated stats
  const totalSystems = systems.length;
  const hcCount = systems.filter((s: P2ASystem) => s.is_hydrocarbon).length;
  const avgProgress = Math.round(systems.reduce((sum: number, s: P2ASystem) => sum + s.completion_percentage, 0) / totalSystems);
  const totalPL = systems.reduce((sum: number, s: P2ASystem) => sum + (s.punchlist_a_count || 0) + (s.punchlist_b_count || 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary Bar — compact horizontal strip */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-foreground">{totalSystems}</span>
          <span className="text-xs text-muted-foreground">Systems</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        {hcCount > 0 && (
          <>
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-sm font-medium">{hcCount}</span>
              <span className="text-xs text-muted-foreground">HC</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}
        <div className="flex items-center gap-1.5">
          <Progress value={avgProgress} className="h-1.5 w-16" />
          <span className="text-xs font-medium text-muted-foreground">{avgProgress}%</span>
        </div>
        {totalPL > 0 && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-amber-500">{totalPL}</span>
              <span className="text-xs text-muted-foreground">Punchlists</span>
            </div>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", viewMode === 'list' && "bg-muted")}
            onClick={() => setViewMode('list')}
          >
            <List className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", viewMode === 'grid' && "bg-muted")}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3">
        {systems.length > 5 && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search systems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddSystemOpen(true)}
          className="gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {/* Systems */}
      <ScrollArea className="h-[420px]">
        {viewMode === 'list' ? (
          <div className="space-y-1.5 pr-4">
            {filteredSystems.map((system: P2ASystem) => (
              <SystemListRow key={system.id} system={system} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
            {filteredSystems.map((system: P2ASystem) => (
              <SystemGridCard key={system.id} system={system} />
            ))}
          </div>
        )}
        {filteredSystems.length === 0 && searchQuery && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No systems match "{searchQuery}"
          </div>
        )}
      </ScrollArea>

      {/* Add System Sheet */}
      <AddSystemSheet
        open={addSystemOpen}
        onOpenChange={setAddSystemOpen}
        handoverPointId={handoverPoint.id}
        handoverPlanId={handoverPoint.handover_plan_id}
        currentVcrCode={handoverPoint.vcr_code}
      />
    </div>
  );
};

// ─── List Row ────────────────────────────────────────────────────
const SystemListRow: React.FC<{ system: P2ASystem }> = ({ system }) => {
  const totalPL = system.punchlist_a_count + system.punchlist_b_count;

  return (
    <div className="group flex items-center gap-4 px-3 py-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all cursor-pointer">
      <MiniProgress percentage={system.completion_percentage} size={36} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{system.name}</span>
          {system.is_hydrocarbon && (
            <Flame className="w-3 h-3 text-orange-500 shrink-0" />
          )}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{system.system_id}</span>
      </div>

      {/* Compact stats — visible on hover */}
      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {totalPL > 0 && (
          <span className="text-[10px] text-amber-500 font-medium">{totalPL} PL</span>
        )}
        {(system.itr_a_count + system.itr_b_count) > 0 && (
          <span className="text-[10px] text-blue-500 font-medium">
            {system.itr_a_count + system.itr_b_count} ITR
          </span>
        )}
      </div>

      {getStatusBadge(system.completion_status, system.is_hydrocarbon)}
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
    </div>
  );
};

// ─── Grid Card ───────────────────────────────────────────────────
const SystemGridCard: React.FC<{ system: P2ASystem }> = ({ system }) => {
  const totalPL = system.punchlist_a_count + system.punchlist_b_count;

  return (
    <Card className="group cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <MiniProgress percentage={system.completion_percentage} size={40} />
          {system.is_hydrocarbon && (
            <Flame className="w-3.5 h-3.5 text-orange-500" />
          )}
        </div>

        <div>
          <p className="text-sm font-medium line-clamp-2 leading-tight">{system.name}</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{system.system_id}</p>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          {getStatusBadge(system.completion_status, system.is_hydrocarbon)}
          {totalPL > 0 && (
            <span className="text-[10px] font-medium text-amber-500">{totalPL} PL</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
