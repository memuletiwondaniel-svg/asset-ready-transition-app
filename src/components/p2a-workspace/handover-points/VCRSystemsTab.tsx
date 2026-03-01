import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Layers,
  ChevronRight,
  ChevronDown,
  Flame,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Circle,
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

// ─── Status Group Config ─────────────────────────────────────────
const STATUS_GROUPS = [
  {
    key: 'completed',
    label: 'Completed',
    statuses: ['RFSU', 'RFO'] as const,
    icon: CheckCircle2,
    accentClass: 'border-l-emerald-500',
    iconClass: 'text-emerald-500',
    dotClass: 'bg-emerald-500',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    statuses: ['IN_PROGRESS'] as const,
    icon: Clock,
    accentClass: 'border-l-amber-500',
    iconClass: 'text-amber-500',
    dotClass: 'bg-amber-500',
  },
  {
    key: 'not_started',
    label: 'Not Started',
    statuses: ['NOT_STARTED'] as const,
    icon: Circle,
    accentClass: 'border-l-muted-foreground/30',
    iconClass: 'text-muted-foreground',
    dotClass: 'bg-muted-foreground/40',
  },
] as const;

// ─── Inline Progress Bar ─────────────────────────────────────────
const InlineProgress: React.FC<{ percentage: number }> = ({ percentage }) => {
  const color =
    percentage >= 70
      ? 'bg-emerald-500'
      : percentage >= 40
        ? 'bg-amber-500'
        : 'bg-muted-foreground/30';

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums font-medium text-muted-foreground w-8 text-right">
        {percentage}%
      </span>
    </div>
  );
};

// ─── System Row ──────────────────────────────────────────────────
const SystemRow: React.FC<{ system: P2ASystem; accentClass: string }> = ({ system, accentClass }) => {
  const totalPL = system.punchlist_a_count + system.punchlist_b_count;

  return (
    <div
      className={cn(
        'group flex items-center gap-4 px-4 py-3 rounded-lg border-l-[3px] bg-card',
        'hover:bg-accent/50 transition-colors cursor-pointer',
        accentClass
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{system.name}</span>
          {system.is_hydrocarbon && (
            <Flame className="w-3 h-3 text-orange-500 shrink-0" />
          )}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{system.system_id}</span>
      </div>

      <InlineProgress percentage={system.completion_percentage} />

      {/* Contextual alerts — only shown when relevant */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {totalPL > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-amber-500/40 text-amber-600 gap-1">
            <AlertTriangle className="w-2.5 h-2.5" />
            {totalPL}
          </Badge>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground transition-colors" />
    </div>
  );
};

// ─── Status Group Section ────────────────────────────────────────
const StatusGroupSection: React.FC<{
  group: typeof STATUS_GROUPS[number];
  systems: P2ASystem[];
  defaultOpen?: boolean;
}> = ({ group, systems, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = group.icon;

  if (systems.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-1 group/trigger">
        <div className={cn('w-2 h-2 rounded-full shrink-0', group.dotClass)} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {group.label}
        </span>
        <span className="text-[11px] text-muted-foreground/60 tabular-nums">
          {systems.length}
        </span>
        <div className="flex-1" />
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 mt-1 mb-4">
          {systems.map((system) => (
            <SystemRow key={system.id} system={system} accentClass={group.accentClass} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// ─── Main Component ──────────────────────────────────────────────
export const VCRSystemsTab: React.FC<VCRSystemsTabProps> = ({ handoverPoint }) => {
  const { systems, isLoading } = useHandoverPointSystems(handoverPoint.id);
  const [addSystemOpen, setAddSystemOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSystems = useMemo(() => {
    if (!searchQuery) return systems;
    const q = searchQuery.toLowerCase();
    return systems.filter(
      (s: P2ASystem) =>
        s.name.toLowerCase().includes(q) || s.system_id.toLowerCase().includes(q)
    );
  }, [systems, searchQuery]);

  // Group by status
  const groupedSystems = useMemo(() => {
    return STATUS_GROUPS.map((group) => ({
      ...group,
      systems: filteredSystems.filter((s: P2ASystem) =>
        (group.statuses as readonly string[]).includes(s.completion_status)
      ),
    }));
  }, [filteredSystems]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!systems.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Layers className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No Systems Assigned</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Assign systems from the workspace panel to begin tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Aggregated stats
  const totalSystems = systems.length;
  const hcCount = systems.filter((s: P2ASystem) => s.is_hydrocarbon).length;
  const completedCount = systems.filter(
    (s: P2ASystem) => s.completion_status === 'RFO' || s.completion_status === 'RFSU'
  ).length;

  return (
    <div className="space-y-4">
      {/* ── Summary Strip ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-2xl font-bold tabular-nums">{totalSystems}</span>
            <span className="text-xs text-muted-foreground ml-1.5">systems</span>
          </div>
          {hcCount > 0 && (
            <Badge variant="outline" className="gap-1 text-xs font-normal border-orange-500/30 text-orange-600">
              <Flame className="w-3 h-3" />
              {hcCount} HC
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalSystems} complete
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddSystemOpen(true)}
          className="gap-1.5 h-8"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {/* ── Search (conditional) ──────────────────────────────── */}
      {systems.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search systems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-transparent focus:border-border"
          />
        </div>
      )}

      {/* ── Grouped Systems ───────────────────────────────────── */}
      <ScrollArea className="h-[440px]">
        <div className="space-y-1 pr-3">
          {groupedSystems.map((group) => (
            <StatusGroupSection
              key={group.key}
              group={group}
              systems={group.systems}
              defaultOpen={group.key !== 'completed'}
            />
          ))}
          {filteredSystems.length === 0 && searchQuery && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No systems match "{searchQuery}"
            </div>
          )}
        </div>
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
