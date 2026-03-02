import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, XCircle, Clock, Target,
  BarChart3, Activity, Shield, Loader2, Brain, Gauge,
  Layers, GitBranch
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useAllProjectORIScores,
  useSyncReadinessNodes,
  useCalculateORI,
  useReadinessNodes,
  useLatestORIScore,
  useORIScores,
} from '@/hooks/useReadinessOntology';
import {
  ResponsiveContainer, RadialBarChart, RadialBar, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { format } from 'date-fns';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

interface ExecutiveDashboardProps {
  onBack: () => void;
}

const MODULE_COLORS: Record<string, string> = {
  ora: 'hsl(var(--chart-1))',
  p2a: 'hsl(var(--chart-2))',
  pssr: 'hsl(var(--chart-3))',
  orm: 'hsl(var(--chart-4))',
  training: 'hsl(var(--chart-5))',
};

const MODULE_LABELS: Record<string, string> = {
  ora: 'ORA Plan',
  p2a: 'P2A Handover',
  pssr: 'PSSR',
  orm: 'OR Maintenance',
  training: 'Training',
};

const ConfidenceBadge: React.FC<{ level: string }> = ({ level }) => {
  const config = {
    high: { variant: 'default' as const, icon: CheckCircle, label: 'High Confidence', className: 'bg-green-500/10 text-green-700 border-green-200 dark:text-green-400' },
    medium: { variant: 'secondary' as const, icon: Clock, label: 'Medium Confidence', className: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400' },
    low: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Low Confidence', className: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400' },
  }[level] || { variant: 'outline' as const, icon: Minus, label: 'N/A', className: '' };

  const Icon = config.icon;
  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

const ScoreGauge: React.FC<{ score: number; size?: 'sm' | 'lg' }> = ({ score, size = 'lg' }) => {
  const color = score >= 75 ? 'hsl(var(--chart-2))' : score >= 50 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))';
  const data = [{ value: score, fill: color }];
  const dim = size === 'lg' ? 200 : 120;

  return (
    <div className="relative" style={{ width: dim, height: dim }}>
      <ResponsiveContainer>
        <RadialBarChart
          cx="50%" cy="50%"
          innerRadius="70%" outerRadius="100%"
          startAngle={180} endAngle={0}
          barSize={size === 'lg' ? 16 : 10}
          data={data}
        >
          <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'hsl(var(--muted))' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground">ORI Score</span>
      </div>
    </div>
  );
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onBack }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const syncMutation = useSyncReadinessNodes();
  const calculateMutation = useCalculateORI();

  // Fetch all projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_title, project_id_prefix, project_id_number')
        .eq('is_active', true)
        .order('project_title');
      if (error) throw error;
      return data;
    },
  });

  const { data: allScores = [], isLoading: scoresLoading } = useAllProjectORIScores();
  const { data: nodes = [] } = useReadinessNodes(selectedProjectId);
  const { data: latestScore } = useLatestORIScore(selectedProjectId);
  const { data: scoreHistory = [] } = useORIScores(selectedProjectId);

  const handleSyncAndCalculate = async (projectId: string) => {
    await syncMutation.mutateAsync(projectId);
    await calculateMutation.mutateAsync({ projectId });
  };

  const isBusy = syncMutation.isPending || calculateMutation.isPending;

  const breadcrumbs = [
    { label: 'Home', onClick: onBack },
    { label: 'Executive Dashboard', icon: Gauge },
  ];

  // Module breakdown for selected project
  const moduleBreakdown = latestScore?.module_scores
    ? Object.entries(latestScore.module_scores as Record<string, any>).map(([key, val]) => ({
        module: MODULE_LABELS[key] || key,
        score: val.score || 0,
        total: val.total || 0,
        completed: val.completed || 0,
        blocked: val.blocked || 0,
        at_risk: val.at_risk || 0,
        fill: MODULE_COLORS[key] || 'hsl(var(--muted))',
      }))
    : [];

  // Score trend for chart
  const trendData = [...scoreHistory]
    .reverse()
    .slice(-20)
    .map((s) => ({
      date: format(new Date(s.calculated_at), 'MMM d'),
      score: Number(s.overall_score),
    }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                Executive Readiness Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Operational Readiness Index (ORI) — Portfolio Intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedProjectId || ''} onValueChange={(v) => setSelectedProjectId(v || null)}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a project for drill-down" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_id_prefix}{p.project_id_number} — {p.project_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProjectId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSyncAndCalculate(selectedProjectId)}
                disabled={isBusy}
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Calculate ORI
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Portfolio Overview KPI Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Active Projects"
            value={projects.length}
            icon={Layers}
            description="Across all modules"
          />
          <KPICard
            title="Scored Projects"
            value={allScores.length}
            icon={Target}
            description="With ORI calculated"
            trend={allScores.length > 0 ? 'up' : undefined}
          />
          <KPICard
            title="Avg. ORI Score"
            value={
              allScores.length > 0
                ? (allScores.reduce((sum, s) => sum + Number(s.overall_score), 0) / allScores.length).toFixed(1) + '%'
                : '—'
            }
            icon={Gauge}
            description="Portfolio average"
          />
          <KPICard
            title="At Risk"
            value={allScores.filter((s) => s.confidence_level === 'low').length}
            icon={AlertTriangle}
            description="Low confidence projects"
            variant={allScores.filter((s) => s.confidence_level === 'low').length > 0 ? 'destructive' : 'default'}
          />
        </div>

        {/* Portfolio Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Portfolio Readiness Overview
            </CardTitle>
            <CardDescription>Click a project to drill down into module-level details</CardDescription>
          </CardHeader>
          <CardContent>
            {scoresLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allScores.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No ORI scores calculated yet.</p>
                <p className="text-sm text-muted-foreground">
                  Select a project above and click "Calculate ORI" to generate the first score.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allScores.map((score) => {
                  const proj = (score as any).projects;
                  const projectLabel = proj
                    ? `${proj.project_id_prefix || ''}${proj.project_id_number || ''} — ${proj.project_title || ''}`
                    : score.project_id;
                  return (
                    <div
                      key={score.id}
                      className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedProjectId === score.project_id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedProjectId(score.project_id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{projectLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {score.node_count} nodes · Last calculated {format(new Date(score.calculated_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                      <ConfidenceBadge level={score.confidence_level} />
                      <div className="w-32">
                        <Progress value={Number(score.overall_score)} className="h-2" />
                      </div>
                      <span className="font-bold text-lg w-16 text-right">
                        {Number(score.overall_score).toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Drill-Down */}
        {selectedProjectId && latestScore && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="modules">Module Breakdown</TabsTrigger>
              <TabsTrigger value="trend">Score Trend</TabsTrigger>
              <TabsTrigger value="nodes">Readiness Nodes ({nodes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ORI Gauge */}
                <Card className="flex flex-col items-center justify-center py-8">
                  <ScoreGauge score={Number(latestScore.overall_score)} />
                  <ConfidenceBadge level={latestScore.confidence_level} />
                  <p className="text-xs text-muted-foreground mt-2">
                    {latestScore.completed_count}/{latestScore.node_count} completed
                  </p>
                </Card>

                {/* Status Breakdown */}
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatusTile label="Completed" count={latestScore.completed_count} icon={CheckCircle} color="text-green-600" />
                      <StatusTile label="In Progress" count={latestScore.node_count - latestScore.completed_count - latestScore.blocked_count - latestScore.at_risk_count} icon={Activity} color="text-blue-600" />
                      <StatusTile label="Blocked" count={latestScore.blocked_count} icon={XCircle} color="text-red-600" />
                      <StatusTile label="At Risk" count={latestScore.at_risk_count} icon={AlertTriangle} color="text-amber-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="modules">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {moduleBreakdown.map((mod) => (
                  <Card key={mod.module}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{mod.module}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{mod.score.toFixed(1)}%</span>
                        <Badge variant="outline">{mod.completed}/{mod.total}</Badge>
                      </div>
                      <Progress value={mod.score} className="h-2" />
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {mod.blocked > 0 && <span className="text-red-600">{mod.blocked} blocked</span>}
                        {mod.at_risk > 0 && <span className="text-amber-600">{mod.at_risk} at risk</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {moduleBreakdown.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No module data available. Sync readiness nodes first.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="trend">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">ORI Score Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {trendData.length > 1 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <RechartsTooltip />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      Need at least 2 score snapshots to show trend. Calculate ORI again later.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nodes">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Readiness Nodes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nodes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No nodes synced yet. Click "Calculate ORI" to sync.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {nodes.map((node) => (
                        <div key={node.id} className="flex items-center gap-3 p-2 rounded border text-sm">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {MODULE_LABELS[node.module] || node.module}
                          </Badge>
                          <span className="flex-1 truncate">{node.label}</span>
                          <Progress value={node.completion_pct} className="w-20 h-1.5" />
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {node.completion_pct}%
                          </span>
                          <NodeStatusBadge status={node.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {selectedProjectId && !latestScore && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 space-y-3">
              <Brain className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No ORI score for this project yet.</p>
              <Button onClick={() => handleSyncAndCalculate(selectedProjectId)} disabled={isBusy}>
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sync & Calculate ORI
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Sub-components
const KPICard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  trend?: 'up' | 'down';
  variant?: 'default' | 'destructive';
}> = ({ title, value, icon: Icon, description, trend, variant = 'default' }) => (
  <Card className={variant === 'destructive' ? 'border-destructive/30' : ''}>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className={`p-2 rounded-lg ${variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'}`}>
          <Icon className={`h-5 w-5 ${variant === 'destructive' ? 'text-destructive' : 'text-primary'}`} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend === 'up' ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />}
          <span className="text-xs text-muted-foreground">vs. last period</span>
        </div>
      )}
    </CardContent>
  </Card>
);

const StatusTile: React.FC<{ label: string; count: number; icon: React.ElementType; color: string }> = ({
  label, count, icon: Icon, color,
}) => (
  <div className="text-center space-y-1 p-3 rounded-lg bg-muted/30">
    <Icon className={`h-5 w-5 mx-auto ${color}`} />
    <p className="text-2xl font-bold">{count}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

const NodeStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: '✓', className: 'bg-green-500/10 text-green-700' },
    in_progress: { label: '◌', className: 'bg-blue-500/10 text-blue-700' },
    blocked: { label: '✕', className: 'bg-red-500/10 text-red-700' },
    at_risk: { label: '!', className: 'bg-amber-500/10 text-amber-700' },
    not_started: { label: '—', className: 'bg-muted text-muted-foreground' },
    na: { label: 'NA', className: 'bg-muted text-muted-foreground' },
  };
  const c = config[status] || config.not_started;
  return <Badge variant="outline" className={`text-xs ${c.className}`}>{c.label}</Badge>;
};

export default ExecutiveDashboard;
