import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Activity, TrendingUp, AlertTriangle, ChevronDown, Loader2, Wrench, PlayCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentProfile } from '@/data/agentProfiles';
import { format } from 'date-fns';
import { useFredLatestKPIs, useFredRecentInteractions, useFredResolutionFailures } from '@/hooks/useFredAnalytics';

interface AgentMonitorCardProps {
  agent: AgentProfile;
}

const KPITile: React.FC<{ label: string; value: string; target: string; ok: boolean }> = ({ label, value, target, ok }) => (
  <div className="rounded-xl border border-border/40 p-4 bg-card">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
    <p className={cn('text-2xl font-bold', ok ? 'text-emerald-600' : 'text-amber-600')}>{value}</p>
    <p className="text-[10px] text-muted-foreground mt-0.5">Target: {target}</p>
  </div>
);

const EmptyState: React.FC<{ icon: React.ElementType; message: string; sub?: string }> = ({ icon: Icon, message, sub }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <Icon className="h-7 w-7 text-muted-foreground/30 mb-2" />
    <p className="text-sm text-muted-foreground">{message}</p>
    {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
  </div>
);

const AgentMonitorCard: React.FC<AgentMonitorCardProps> = ({ agent }) => {
  const [toolUsageOpen, setToolUsageOpen] = React.useState(false);
  const hasAnalytics = agent.code === 'fred' || agent.code === 'selma';

  // For agents with analytics, use the hooks. For others, show empty states.
  // We'll use a simple approach: render the analytics content conditionally.

  return (
    <Card className="border-border/40 shadow-sm h-full">
      <Tabs defaultValue="activity" className="h-full flex flex-col">
        <CardHeader className="pb-0 pt-4 px-5 shrink-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            Agent Monitor
          </CardTitle>
          <TabsList className="w-full justify-start bg-muted/50 p-1">
            <TabsTrigger value="activity" className="gap-1.5 text-xs">
              <Activity className="h-3.5 w-3.5" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="issues" className="gap-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              Issues
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-5 pt-4">
          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-0">
            {hasAnalytics ? (
              <FredActivityView agentCode={agent.code} agentName={agent.name} />
            ) : (
              <EmptyState
                icon={Activity}
                message={`No interactions recorded yet`}
                sub={`${agent.name} will show activity data here once operational`}
              />
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-0">
            {hasAnalytics ? (
              <FredPerformanceView agentCode={agent.code} agentName={agent.name} />
            ) : (
              <EmptyState
                icon={TrendingUp}
                message="Performance metrics coming soon"
                sub={`${agent.name} is ${agent.status === 'planned' ? 'in development' : 'being configured'}`}
              />
            )}
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="mt-0">
            {hasAnalytics ? (
              <FredIssuesView agentCode={agent.code} agentName={agent.name} />
            ) : (
              <EmptyState
                icon={CheckCircle}
                message={`No unresolved items`}
                sub={`${agent.name} is handling all queries successfully`}
              />
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

// Sub-components that use Fred analytics hooks
const FredActivityView: React.FC<{ agentCode: string; agentName: string }> = ({ agentCode, agentName }) => {
  const { useFredRecentInteractions } = require('@/hooks/useFredAnalytics');
  const { data: interactions = [], isLoading } = useFredRecentInteractions(10);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (interactions.length === 0) return <EmptyState icon={Activity} message="No interactions recorded yet" />;

  return (
    <div className="space-y-2">
      {interactions.slice(0, 10).map((item: any) => (
        <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors border border-border/20">
          <div className={cn(
            'w-2 h-2 rounded-full shrink-0',
            item.outcome === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">{item.query_text || 'Query'}</p>
            <p className="text-[10px] text-muted-foreground">{item.project_code || '—'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">{item.latency_ms}ms</p>
            <p className="text-[9px] text-muted-foreground/60">{format(new Date(item.created_at), 'HH:mm')}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const FredPerformanceView: React.FC<{ agentCode: string; agentName: string }> = ({ agentCode, agentName }) => {
  const { useFredLatestKPIs } = require('@/hooks/useFredAnalytics');
  const { data: kpis = [], isLoading } = useFredLatestKPIs();

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const getKPI = (name: string) => kpis.find((k: any) => k.kpi_name === name);
  const successRate = getKPI('retrieval_success_rate');
  const avgLatency = getKPI('mean_time_to_answer_ms');
  const unresolvedRate = getKPI('unresolved_rate');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <KPITile
          label="Success Rate"
          value={successRate ? `${(successRate.kpi_value * 100).toFixed(0)}%` : '—'}
          target="≥ 90%"
          ok={!successRate || successRate.kpi_value >= 0.9}
        />
        <KPITile
          label="Avg Response Time"
          value={avgLatency ? `${(avgLatency.kpi_value / 1000).toFixed(1)}s` : '—'}
          target="≤ 15s"
          ok={!avgLatency || avgLatency.kpi_value <= 15000}
        />
        <KPITile
          label="Unresolved Rate"
          value={unresolvedRate ? `${(unresolvedRate.kpi_value * 100).toFixed(0)}%` : '—'}
          target="≤ 10%"
          ok={!unresolvedRate || unresolvedRate.kpi_value <= 0.1}
        />
      </div>

      <Collapsible open={false}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8 text-muted-foreground">
            <span className="flex items-center gap-1.5"><Wrench className="h-3 w-3" /> Tool Usage</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <p className="text-xs text-muted-foreground text-center py-4">Tool usage breakdown coming soon</p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const FredIssuesView: React.FC<{ agentCode: string; agentName: string }> = ({ agentCode, agentName }) => {
  const { useFredResolutionFailures } = require('@/hooks/useFredAnalytics');
  const { data: failures = [], isLoading } = useFredResolutionFailures();

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const unresolved = failures.filter((f: any) => !f.resolved);
  if (unresolved.length === 0) {
    return <EmptyState icon={CheckCircle} message={`No unresolved items`} sub={`${agentName} is handling all queries successfully`} />;
  }

  return (
    <div className="space-y-2">
      {unresolved.slice(0, 10).map((item: any) => (
        <div key={item.id} className="border border-border/40 rounded-lg p-3">
          <p className="text-xs text-foreground mb-1">{item.query_text}</p>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Seen {item.occurrence_count}x · Last: {format(new Date(item.last_seen), 'MMM d')}</p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">Retry</Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground">Dismiss</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const EmptyStateStandalone = EmptyState;

export default AgentMonitorCard;
