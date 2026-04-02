import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Target, Search, Download, Brain, Activity, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle2, XCircle, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useSelmaLatestKPIs, useSelmaInteractions, useSelmaFailures, useSelmaStrategies, useSelmaKPITrend, toggleStrategy, useSelmaTrainingQueue, useSelmaKnowledge } from "@/hooks/useSelmaAnalytics";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";

const KPI_CONFIG: Record<string, { label: string; icon: any; target: number; unit: string; color: string }> = {
  retrieval_success_rate: { label: "Retrieval Success", icon: Target, target: 90, unit: "%", color: "text-emerald-500" },
  first_stage_hit_rate: { label: "First-Stage Hit", icon: Search, target: 70, unit: "%", color: "text-blue-500" },
  mean_time_to_answer_ms: { label: "Avg Response Time", icon: Clock, target: 15000, unit: "ms", color: "text-amber-500" },
  download_success_rate: { label: "Download Success", icon: Download, target: 95, unit: "%", color: "text-violet-500" },
  analysis_completion_rate: { label: "Analysis Complete", icon: CheckCircle2, target: 98, unit: "%", color: "text-teal-500" },
  user_satisfaction_index: { label: "User Satisfaction", icon: TrendingUp, target: 85, unit: "%", color: "text-pink-500" },
  strategy_efficiency: { label: "Strategy Efficiency", icon: Brain, target: 50, unit: "%", color: "text-indigo-500" },
};

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const config: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; icon: any }> = {
    success: { variant: "default", icon: CheckCircle2 },
    partial: { variant: "secondary", icon: Minus },
    no_results: { variant: "outline", icon: XCircle },
    error: { variant: "destructive", icon: AlertTriangle },
    download_failed: { variant: "destructive", icon: XCircle },
    timeout: { variant: "destructive", icon: Clock },
    pending: { variant: "outline", icon: Clock },
  };
  const c = config[outcome] || config.pending;
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className="gap-1 text-[10px]">
      <Icon className="h-3 w-3" />
      {outcome}
    </Badge>
  );
}

export default function SelmaAnalytics() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [trendKPI, setTrendKPI] = useState("retrieval_success_rate");

  const { data: latestKPIs, isLoading: kpisLoading } = useSelmaLatestKPIs();
  const { data: interactions, isLoading: intLoading } = useSelmaInteractions(100);
  const { data: failures } = useSelmaFailures(20);
  const { data: strategies } = useSelmaStrategies();
  const { data: trendData } = useSelmaKPITrend(trendKPI, 30);
  const { data: trainingQueue } = useSelmaTrainingQueue();
  const { data: knowledge } = useSelmaKnowledge();

  const handleToggleStrategy = async (id: string, current: boolean) => {
    try {
      await toggleStrategy(id, !current);
      queryClient.invalidateQueries({ queryKey: ['selma-strategies'] });
      toast.success(`Strategy ${!current ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error("Failed to update strategy");
    }
  };

  // Cascade depth distribution
  const cascadeDistribution = interactions ? (() => {
    const dist: Record<number, number> = {};
    for (const i of interactions) {
      if (i.cascade_depth > 0) {
        dist[i.cascade_depth] = (dist[i.cascade_depth] || 0) + 1;
      }
    }
    return Object.entries(dist).map(([depth, count]) => ({ depth: `Stage ${depth}`, count })).sort((a, b) => a.depth.localeCompare(b.depth));
  })() : [];

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation 
          currentPageLabel="Selma Analytics" 
          favoritePath="/admin/selma-analytics"
          customBreadcrumbs={[
            { label: 'Home', path: '/', onClick: () => navigate('/') },
            { label: 'Administration', path: '/admin-tools', onClick: () => navigate('/admin-tools') }
          ]}
        />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin-tools')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Selma Performance Analytics
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Self-improvement framework — KPIs, learning loop, strategy management</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(KPI_CONFIG).map(([key, config]) => {
            const kpi = latestKPIs?.[key];
            const value = kpi?.kpi_value ?? 0;
            const isAboveTarget = key === 'mean_time_to_answer_ms' ? value <= config.target : value >= config.target;
            const Icon = config.icon;
            return (
              <Card 
                key={key} 
                className={`cursor-pointer transition-all hover:shadow-md ${trendKPI === key ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setTrendKPI(key)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    <span className="text-[10px] text-muted-foreground font-medium truncate">{config.label}</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-xl font-bold text-foreground">
                      {key === 'mean_time_to_answer_ms' ? formatLatency(value) : `${value}${config.unit}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {isAboveTarget ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-[10px] ${isAboveTarget ? 'text-emerald-500' : 'text-red-500'}`}>
                      Target: {key === 'mean_time_to_answer_ms' ? formatLatency(config.target) : `${config.target}${config.unit}`}
                    </span>
                  </div>
                  {kpi?.sample_size !== undefined && (
                    <span className="text-[9px] text-muted-foreground/50">n={kpi.sample_size}</span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {KPI_CONFIG[trendKPI]?.label || trendKPI} — 30-Day Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData && trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData.map(d => ({ ...d, date: new Date(d.period_start).toLocaleDateString() }))}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="kpi_value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No trend data yet — KPIs are computed daily
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="interactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="interactions">Recent Interactions</TabsTrigger>
            <TabsTrigger value="failures">Failure Analysis</TabsTrigger>
            <TabsTrigger value="cascade">Search Strategy</TabsTrigger>
            <TabsTrigger value="strategies">Learned Strategies</TabsTrigger>
          </TabsList>

          {/* Recent Interactions */}
          <TabsContent value="interactions">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Query</TableHead>
                      <TableHead className="text-xs">Intent</TableHead>
                      <TableHead className="text-xs">Outcome</TableHead>
                      <TableHead className="text-xs">Docs</TableHead>
                      <TableHead className="text-xs">Cascade</TableHead>
                      <TableHead className="text-xs">Latency</TableHead>
                      <TableHead className="text-xs">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(interactions || []).slice(0, 30).map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="text-xs max-w-[200px] truncate">{i.query_text || '—'}</TableCell>
                        <TableCell className="text-xs">{i.intent_detected || '—'}</TableCell>
                        <TableCell><OutcomeBadge outcome={i.outcome} /></TableCell>
                        <TableCell className="text-xs tabular-nums">{i.documents_found}</TableCell>
                        <TableCell className="text-xs tabular-nums">{i.cascade_depth || '—'}</TableCell>
                        <TableCell className="text-xs tabular-nums">{formatLatency(i.total_latency_ms)}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{new Date(i.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {(!interactions || interactions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">
                          No Selma interactions recorded yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Failure Analysis */}
          <TabsContent value="failures">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Query</TableHead>
                      <TableHead className="text-xs">Intent</TableHead>
                      <TableHead className="text-xs">Outcome</TableHead>
                      <TableHead className="text-xs">Cascade</TableHead>
                      <TableHead className="text-xs">Error</TableHead>
                      <TableHead className="text-xs">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(failures || []).map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="text-xs max-w-[200px] truncate">{f.query_text || '—'}</TableCell>
                        <TableCell className="text-xs">{f.intent_detected || '—'}</TableCell>
                        <TableCell><OutcomeBadge outcome={f.outcome} /></TableCell>
                        <TableCell className="text-xs tabular-nums">{f.cascade_depth || '—'}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate text-red-500">{f.error_details || '—'}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {(!failures || failures.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                          No failures recorded — Selma is performing well 🎉
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Strategy Distribution */}
          <TabsContent value="cascade">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Search Cascade Depth Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {cascadeDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={cascadeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="depth" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    No search data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learned Strategies */}
          <TabsContent value="strategies">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Trigger Pattern</TableHead>
                      <TableHead className="text-xs">Confidence</TableHead>
                      <TableHead className="text-xs">Applied</TableHead>
                      <TableHead className="text-xs">Success Rate</TableHead>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs">Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(strategies || []).map(s => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{s.strategy_type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate font-mono">{s.trigger_pattern}</TableCell>
                        <TableCell className="text-xs tabular-nums">{(s.confidence * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-xs tabular-nums">{s.times_applied}</TableCell>
                        <TableCell className="text-xs tabular-nums">
                          <span className={s.success_rate >= 0.7 ? 'text-emerald-500' : s.success_rate >= 0.4 ? 'text-amber-500' : 'text-red-500'}>
                            {(s.success_rate * 100).toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{s.source}</TableCell>
                        <TableCell>
                          <Switch
                            checked={s.is_active}
                            onCheckedChange={() => handleToggleStrategy(s.id, s.is_active)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!strategies || strategies.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">
                          No learned strategies yet — they'll appear after the training review runs
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
