import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, XCircle, Clock, Target,
  BarChart3, Activity, Shield, Loader2, Brain, Gauge,
  Layers, GitBranch, Zap, ShieldAlert, ArrowUpRight, ArrowDownRight, ArrowRight
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
import { useVCRItemCategories } from '@/hooks/useVCRItemCategories';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

interface ExecutiveDashboardProps {
  onBack: () => void;
}

// Color helpers
const getORIColor = (score: number) => {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const getORIBg = (score: number) => {
  if (score >= 85) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 70) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-red-500/10 border-red-500/20';
};

const getSCSLabel = (score: number) => {
  if (score >= 85) return { label: 'High Confidence', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400' };
  if (score >= 70) return { label: 'Moderate Risk', className: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400' };
  if (score >= 50) return { label: 'High Risk', className: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400' };
  return { label: 'Startup Unlikely', className: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400' };
};

const getTrendIcon = (trend: 'up' | 'down' | 'flat') => {
  if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-emerald-600" />;
  if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-red-600" />;
  return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
};

const getRiskBadge = (blocked: number, atRisk: number) => {
  if (blocked > 0) return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200 text-xs">High</Badge>;
  if (atRisk > 0) return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200 text-xs">Moderate</Badge>;
  return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200 text-xs">Low</Badge>;
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onBack }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const syncMutation = useSyncReadinessNodes();
  const calculateMutation = useCalculateORI();
  const { data: categories = [] } = useVCRItemCategories();

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

  // Dimension breakdown from latest score
  const dimensionBreakdown = useMemo(() => {
    if (!latestScore?.dimension_scores) return [];
    const ds = latestScore.dimension_scores as Record<string, any>;
    return Object.entries(ds).map(([code, val]) => ({
      code,
      name: val.name || code,
      score: val.score || 0,
      rawScore: val.raw_score || 0,
      confidence: val.confidence || 0.8,
      riskPenalty: val.risk_penalty || 0,
      total: val.total || 0,
      completed: val.completed || 0,
      blocked: val.blocked || 0,
      atRisk: val.at_risk || 0,
      weight: val.weight || 0.2,
    }));
  }, [latestScore]);

  // Calculate trend per dimension from score history
  const dimensionTrends = useMemo(() => {
    if (scoreHistory.length < 2) return {};
    const latest = scoreHistory[0]?.dimension_scores as Record<string, any> || {};
    const prev = scoreHistory[1]?.dimension_scores as Record<string, any> || {};
    const trends: Record<string, 'up' | 'down' | 'flat'> = {};
    for (const code of Object.keys(latest)) {
      const curr = latest[code]?.score || 0;
      const old = prev[code]?.score || 0;
      if (curr > old + 1) trends[code] = 'up';
      else if (curr < old - 1) trends[code] = 'down';
      else trends[code] = 'flat';
    }
    return trends;
  }, [scoreHistory]);

  // Top 5 startup blockers
  const topBlockers = useMemo(() => {
    return nodes
      .filter(n => n.status === 'blocked' || n.risk_severity === 'startup_blocking' || n.risk_severity === 'major')
      .sort((a, b) => {
        const sev = { startup_blocking: 4, major: 3, moderate: 2, minor: 1, none: 0 };
        return (sev[b.risk_severity as keyof typeof sev] || 0) - (sev[a.risk_severity as keyof typeof sev] || 0);
      })
      .slice(0, 5);
  }, [nodes]);

  // Score trend for chart
  const trendData = useMemo(() => {
    return [...scoreHistory]
      .reverse()
      .slice(-20)
      .map((s) => ({
        date: format(new Date(s.calculated_at), 'MMM d'),
        score: Number(s.overall_score),
        scs: Number(s.startup_confidence_score || 0),
        target: 85, // target readiness curve
      }));
  }, [scoreHistory]);

  // Risk summary stats
  const riskSummary = useMemo(() => {
    const blockedNodes = nodes.filter(n => n.status === 'blocked' || n.risk_severity === 'major' || n.risk_severity === 'startup_blocking');
    const startupBlocking = nodes.filter(n => n.risk_severity === 'startup_blocking');
    const dimensionsBelow70 = dimensionBreakdown.filter(d => d.score < 70 && d.total > 0);
    const systemsBelow60 = dimensionBreakdown.filter(d => d.score < 60 && d.total > 0);
    return { highRisks: blockedNodes.length, startupBlocking: startupBlocking.length, dimensionsBelow70: dimensionsBelow70.length, systemsBelow60: systemsBelow60.length };
  }, [nodes, dimensionBreakdown]);

  // Dimension chart data
  const dimChartData = dimensionBreakdown.map(d => ({
    name: d.code,
    score: d.score,
    fill: d.score >= 85 ? 'hsl(var(--chart-2))' : d.score >= 70 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))',
  }));

  const oriScore = latestScore ? Number(latestScore.overall_score) : 0;
  const scsScore = latestScore ? Number(latestScore.startup_confidence_score || 0) : 0;
  const scsInfo = getSCSLabel(scsScore);

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
                ORIP Executive Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Operational Readiness Intelligence — Decision Confidence View
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
              <Button variant="outline" size="sm" onClick={() => handleSyncAndCalculate(selectedProjectId)} disabled={isBusy}>
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Calculate ORI
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* SECTION 1: Strategic Decision Banner */}
        {selectedProjectId && latestScore && (
          <div className={`rounded-xl border-2 p-6 ${getORIBg(oriScore)}`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              {/* ORI Score */}
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">ORIP Readiness Index</p>
                <p className={`text-5xl font-black ${getORIColor(oriScore)}`}>{oriScore.toFixed(1)}%</p>
                <Badge variant="outline" className={`mt-2 ${oriScore >= 85 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : oriScore >= 70 ? 'bg-amber-500/10 text-amber-600 border-amber-200' : 'bg-red-500/10 text-red-600 border-red-200'}`}>
                  {oriScore >= 85 ? 'On Track' : oriScore >= 70 ? 'Caution' : 'At Risk'}
                </Badge>
              </div>
              {/* SCS */}
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Startup Confidence</p>
                <p className={`text-4xl font-bold ${getORIColor(scsScore)}`}>{scsScore.toFixed(1)}%</p>
                <Badge variant="outline" className={`mt-2 ${scsInfo.className}`}>{scsInfo.label}</Badge>
              </div>
              {/* Risk Penalty */}
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Risk Penalty</p>
                <p className="text-3xl font-bold text-foreground">−{Number(latestScore.risk_penalty_total || 0).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Capped at 15%</p>
              </div>
              {/* Counts */}
              <div className="text-center space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Readiness Nodes</p>
                <p className="text-2xl font-bold">{latestScore.completed_count}/{latestScore.node_count}</p>
                <div className="flex justify-center gap-2 text-xs">
                  {latestScore.blocked_count > 0 && <span className="text-red-600">{latestScore.blocked_count} blocked</span>}
                  {latestScore.at_risk_count > 0 && <span className="text-amber-600">{latestScore.at_risk_count} at risk</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Dimension Breakdown */}
        {selectedProjectId && latestScore && dimensionBreakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Readiness Dimension Breakdown
                </CardTitle>
                <CardDescription>VCR category dimensions with confidence-adjusted scores</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dimension</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Confidence</TableHead>
                      <TableHead className="text-center">Trend</TableHead>
                      <TableHead className="text-center">Risk</TableHead>
                      <TableHead className="text-center">Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dimensionBreakdown.map((dim) => (
                      <TableRow key={dim.code}>
                        <TableCell className="font-medium">
                          <div>
                            <span>{dim.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({dim.completed}/{dim.total})</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${getORIColor(dim.score)}`}>{dim.score.toFixed(1)}%</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm text-muted-foreground">{dim.confidence.toFixed(2)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {getTrendIcon(dimensionTrends[dim.code] || 'flat')}
                        </TableCell>
                        <TableCell className="text-center">
                          {getRiskBadge(dim.blocked, dim.atRisk)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm text-muted-foreground">{(dim.weight * 100).toFixed(0)}%</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Dimension Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dimension Scores</CardTitle>
              </CardHeader>
              <CardContent>
                {dimChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dimChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} className="text-xs" />
                      <YAxis type="category" dataKey="name" className="text-xs" width={40} />
                      <RechartsTooltip />
                      <ReferenceLine x={70} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                      <ReferenceLine x={85} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {dimChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No dimension data</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* SECTION 3: Top 5 Blockers + Risk Summary */}
        {selectedProjectId && latestScore && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Startup Blockers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  Top 5 Startup Blockers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topBlockers.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-sm text-muted-foreground">No startup blockers identified</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topBlockers.map((node, i) => (
                      <div key={node.id} className="flex items-start gap-3 p-3 rounded-lg border bg-red-500/5 border-red-200/30">
                        <span className="text-xs font-bold text-red-600 bg-red-100 rounded-full w-6 h-6 flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{node.label}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs bg-muted">{node.module}</Badge>
                            <Badge variant="outline" className={`text-xs ${node.risk_severity === 'startup_blocking' ? 'bg-red-500/10 text-red-700' : node.risk_severity === 'major' ? 'bg-amber-500/10 text-amber-700' : 'bg-muted'}`}>
                              {node.risk_severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{node.completion_pct}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk Impact Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Risk Impact Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50 border">
                    <AlertTriangle className="h-5 w-5 mx-auto text-amber-600 mb-2" />
                    <p className="text-3xl font-bold">{riskSummary.highRisks}</p>
                    <p className="text-xs text-muted-foreground">Open High Risks</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50 border">
                    <XCircle className="h-5 w-5 mx-auto text-red-600 mb-2" />
                    <p className="text-3xl font-bold">{riskSummary.startupBlocking}</p>
                    <p className="text-xs text-muted-foreground">Startup-Blocking</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50 border">
                    <TrendingDown className="h-5 w-5 mx-auto text-amber-600 mb-2" />
                    <p className="text-3xl font-bold">{riskSummary.dimensionsBelow70}</p>
                    <p className="text-xs text-muted-foreground">Dimensions &lt; 70%</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50 border">
                    <Activity className="h-5 w-5 mx-auto text-red-600 mb-2" />
                    <p className="text-3xl font-bold">{riskSummary.systemsBelow60}</p>
                    <p className="text-xs text-muted-foreground">Systems &lt; 60%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SECTION 4: Predictive Trend */}
        {selectedProjectId && latestScore && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                ORI Predictive Trend
              </CardTitle>
              <CardDescription>ORI trajectory vs. required readiness target (85%)</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length > 1 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <RechartsTooltip />
                    <ReferenceLine y={85} stroke="hsl(var(--chart-2))" strokeDasharray="8 4" label={{ value: 'Target 85%', position: 'right', className: 'text-xs fill-emerald-600' }} />
                    <ReferenceLine y={70} stroke="hsl(var(--chart-4))" strokeDasharray="4 4" label={{ value: '70%', position: 'right', className: 'text-xs fill-amber-600' }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--primary))' }} name="ORI Score" />
                    <Line type="monotone" dataKey="scs" stroke="hsl(var(--chart-3))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="SCS" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Need at least 2 score snapshots to show trend. Calculate ORI again later.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Portfolio Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Portfolio Readiness Overview
            </CardTitle>
            <CardDescription>Click a project to drill down</CardDescription>
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
                <p className="text-sm text-muted-foreground">Select a project and click "Calculate ORI" to generate the first score.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-center">ORI</TableHead>
                    <TableHead className="text-center">SCS</TableHead>
                    <TableHead className="text-center">Nodes</TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                    <TableHead className="text-center">Last Calculated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allScores.map((score) => {
                    const proj = (score as any).projects;
                    const label = proj ? `${proj.project_id_prefix || ''}${proj.project_id_number || ''} — ${proj.project_title || ''}` : score.project_id;
                    const scs = Number(score.startup_confidence_score || 0);
                    return (
                      <TableRow
                        key={score.id}
                        className={`cursor-pointer ${selectedProjectId === score.project_id ? 'bg-primary/5' : ''}`}
                        onClick={() => setSelectedProjectId(score.project_id)}
                      >
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${getORIColor(Number(score.overall_score))}`}>{Number(score.overall_score).toFixed(1)}%</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${getORIColor(scs)}`}>{scs.toFixed(1)}%</span>
                        </TableCell>
                        <TableCell className="text-center text-sm">{score.node_count}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-xs ${score.confidence_level === 'high' ? 'bg-emerald-500/10 text-emerald-600' : score.confidence_level === 'medium' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'}`}>
                            {score.confidence_level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {format(new Date(score.calculated_at), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* No Score Prompt */}
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

export default ExecutiveDashboard;
