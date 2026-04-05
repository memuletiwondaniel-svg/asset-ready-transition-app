import React, { useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Clock, Target, Search, Activity, AlertTriangle, CheckCircle2, XCircle, Minus, Play, BookOpen, Wrench, Upload, Brain, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useFredLatestKPIs, useFredInteractions, useFredResolutionFailures, useFredKPITrend, useFredTrainingQueue, useFredDomainKnowledge, useFredTrainingDocuments, FRED_TRAINING_CATEGORIES } from "@/hooks/useFredAnalytics";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/enhanced-auth/AuthProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const KPI_CONFIG: Record<string, { label: string; icon: any; target: number; unit: string; color: string; invertTarget?: boolean }> = {
  retrieval_success_rate: { label: "Retrieval Success", icon: Target, target: 90, unit: "%", color: "text-emerald-500" },
  mean_time_to_answer_ms: { label: "Avg Response Time", icon: Clock, target: 15000, unit: "ms", color: "text-amber-500", invertTarget: true },
  resolution_failure_rate: { label: "Resolution Failures", icon: AlertTriangle, target: 10, unit: "%", color: "text-red-500", invertTarget: true },
  tool_usage_distribution: { label: "Tool Coverage", icon: Wrench, target: 80, unit: "%", color: "text-blue-500" },
  certificate_coverage: { label: "Cert Coverage", icon: CheckCircle2, target: 80, unit: "%", color: "text-violet-500" },
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
  };
  const c = config[outcome] || config.no_results;
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className="gap-1 text-[10px]">
      <Icon className="h-3 w-3" />
      {outcome}
    </Badge>
  );
}

export default function FredAnalytics() {
  const queryClient = useQueryClient();
  const [trendKPI, setTrendKPI] = useState("retrieval_success_rate");
  const [scorerRunning, setScorerRunning] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>("blank_itrs");
  const [trainingRunning, setTrainingRunning] = useState(false);
  const { session } = useAuth();

  const { data: latestKPIs } = useFredLatestKPIs();
  const { data: interactions } = useFredInteractions(100);
  const { data: resolutionFailures } = useFredResolutionFailures(true);
  const { data: trendData } = useFredKPITrend(trendKPI, 30);
  const { data: trainingQueue } = useFredTrainingQueue();
  const { data: domainKnowledge } = useFredDomainKnowledge();
  const { data: trainingDocs } = useFredTrainingDocuments();

  const handleRunScorer = async () => {
    setScorerRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('fred-performance-scorer');
      if (error) throw error;
      toast.success(`Scorer completed: ${data?.total_interactions || 0} interactions processed`);
      queryClient.invalidateQueries({ queryKey: ['fred-latest-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['fred-kpi-trend'] });
    } catch (err: any) {
      toast.error(`Scorer failed: ${err.message || 'Unknown error'}`);
    } finally {
      setScorerRunning(false);
    }
  };

  const handleResolveFailure = async (failure: { id: string; cleaned_query: string; closest_matches: any[] }) => {
    if (!failure.closest_matches || failure.closest_matches.length === 0) {
      toast.error("No suggested matches available");
      return;
    }
    const best = failure.closest_matches[0];
    try {
      await supabase.from('fred_resolution_failures')
        .update({ resolved: true, resolved_as: best.code || best.name || 'mapped' })
        .eq('id', failure.id);

      queryClient.invalidateQueries({ queryKey: ['fred-resolution-failures'] });
      toast.success(`Resolved "${failure.cleaned_query}" → ${best.code || best.name}`);
    } catch (err: any) {
      toast.error(`Failed to resolve: ${err.message}`);
    }
  };

  const handleUploadTrainingDoc = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const userId = session?.user?.id;
    if (!userId) { toast.error("Not authenticated"); return; }

    for (const file of Array.from(files)) {
      const filePath = `${userId}/${uploadCategory}/${file.name}`;
      try {
        const { error: uploadErr } = await supabase.storage
          .from('fred_training_docs')
          .upload(filePath, file, { upsert: true });
        if (uploadErr) throw uploadErr;

        // Register document
        await supabase.from('fred_training_documents').insert({
          file_name: file.name,
          file_path: filePath,
          category: uploadCategory,
          file_size: file.size,
          uploaded_by: userId,
        } as any);

        // Add to training queue
        await supabase.from('fred_training_queue').insert({
          file_path: filePath,
          category: uploadCategory,
          priority: 5,
        } as any);

        toast.success(`Uploaded: ${file.name}`);
      } catch (err: any) {
        toast.error(`Failed: ${file.name} — ${err.message}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['fred-training-queue'] });
    queryClient.invalidateQueries({ queryKey: ['fred-training-documents'] });
    e.target.value = '';
  }, [uploadCategory, session, queryClient]);

  const handleRunTraining = async () => {
    setTrainingRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('fred-knowledge-builder');
      if (error) throw error;
      toast.success(`Training completed: ${data?.processed || 0} documents processed`);
      queryClient.invalidateQueries({ queryKey: ['fred-training-queue'] });
      queryClient.invalidateQueries({ queryKey: ['fred-domain-knowledge'] });
    } catch (err: any) {
      toast.error(`Training failed: ${err.message}`);
    } finally {
      setTrainingRunning(false);
    }
  };

  // Tool usage distribution from interactions
  const toolDistribution = interactions ? (() => {
    const dist: Record<string, number> = {};
    for (const i of interactions) {
      const tool = i.tool_used || 'unknown';
      dist[tool] = (dist[tool] || 0) + 1;
    }
    return Object.entries(dist).map(([tool, count]) => ({ tool: tool.replace('get_', '').replace('search_', ''), count })).sort((a, b) => b.count - a.count);
  })() : [];

  // Project heatmap from interactions
  const projectHeatmap = interactions ? (() => {
    const dist: Record<string, number> = {};
    for (const i of interactions) {
      const proj = i.project_code || 'unspecified';
      dist[proj] = (dist[proj] || 0) + 1;
    }
    return Object.entries(dist).map(([project, count]) => ({ project, count })).sort((a, b) => b.count - a.count);
  })() : [];

  return (
    <div className="space-y-6">
      {/* Performance Analytics */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Fred Performance Analytics
              </CardTitle>
              <p className="text-xs text-muted-foreground">GoCompletions integration — KPIs, tool usage, resolution tracking</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunScorer}
              disabled={scorerRunning}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              {scorerRunning ? 'Running...' : 'Run Scorer Now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(KPI_CONFIG).map(([key, config]) => {
              const kpi = latestKPIs?.[key];
              const value = kpi?.kpi_value ?? 0;
              const isAboveTarget = config.invertTarget ? value <= config.target : value >= config.target;
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
          <div>
            <h4 className="text-sm font-medium mb-2">
              {KPI_CONFIG[trendKPI]?.label || trendKPI} — 30-Day Trend
            </h4>
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
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed border-border">
                No trend data yet — click "Run Scorer Now" to compute KPIs
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="interactions" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="interactions">Recent Interactions</TabsTrigger>
          <TabsTrigger value="unresolved">
            Unresolved Lookups
            {resolutionFailures && resolutionFailures.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[9px] px-1.5 py-0">{resolutionFailures.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tools">Tool Usage</TabsTrigger>
          <TabsTrigger value="projects">Project Heatmap</TabsTrigger>
          <TabsTrigger value="training">Knowledge Training</TabsTrigger>
        </TabsList>

        <TabsContent value="interactions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Query</TableHead>
                    <TableHead className="text-xs">Tool</TableHead>
                    <TableHead className="text-xs">Project</TableHead>
                    <TableHead className="text-xs">Outcome</TableHead>
                    <TableHead className="text-xs">Results</TableHead>
                    <TableHead className="text-xs">Latency</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(interactions || []).slice(0, 30).map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="text-xs max-w-[200px] truncate">{i.query_text || '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{i.tool_used || '—'}</TableCell>
                      <TableCell className="text-xs">{i.project_code || '—'}</TableCell>
                      <TableCell><OutcomeBadge outcome={i.outcome} /></TableCell>
                      <TableCell className="text-xs tabular-nums">{i.result_count}</TableCell>
                      <TableCell className="text-xs tabular-nums">{formatLatency(i.latency_ms)}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{new Date(i.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!interactions || interactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">
                        No Fred interactions recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unresolved">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-500" />
                Unresolved Subsystem/Tag Lookups
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Failed lookups with occurrence count ≥ 3. Resolve by mapping to correct codes.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Query</TableHead>
                    <TableHead className="text-xs">Cleaned</TableHead>
                    <TableHead className="text-xs">Occurrences</TableHead>
                    <TableHead className="text-xs">Closest Matches</TableHead>
                    <TableHead className="text-xs">First Seen</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(resolutionFailures || []).map(rf => (
                    <TableRow key={rf.id}>
                      <TableCell className="text-xs max-w-[150px] truncate">{rf.query_text}</TableCell>
                      <TableCell className="text-xs font-mono">{rf.cleaned_query}</TableCell>
                      <TableCell className="text-xs tabular-nums">
                        <Badge variant={rf.occurrence_count >= 5 ? 'destructive' : rf.occurrence_count >= 3 ? 'secondary' : 'outline'} className="text-[10px]">
                          {rf.occurrence_count}×
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[250px]">
                        {rf.closest_matches && rf.closest_matches.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {rf.closest_matches.map((m: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-[9px] gap-0.5">
                                {m.code || m.name} ({m.score || m.similarity})
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No close matches</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {new Date(rf.first_seen).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-1"
                          disabled={!rf.closest_matches || rf.closest_matches.length === 0}
                          onClick={() => handleResolveFailure(rf)}
                        >
                          <Search className="h-3 w-3" />
                          Resolve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!resolutionFailures || resolutionFailures.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                        No unresolved lookups — Fred is resolving all queries 🎉
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-500" />
                Tool Usage Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {toolDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={toolDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="tool" type="category" tick={{ fontSize: 10 }} width={150} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed border-border">
                  No tool usage data yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-500" />
                Query Volume by Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectHeatmap.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={projectHeatmap}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="project" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed border-border">
                  No project data yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training">
          <div className="space-y-4">
            {/* Upload Section */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    Upload Training Documents
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunTraining}
                    disabled={trainingRunning}
                    className="gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {trainingRunning ? 'Training...' : 'Run Knowledge Builder'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                    <Select value={uploadCategory} onValueChange={setUploadCategory}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FRED_TRAINING_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Documents</label>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.pptx,.xlsx,.png,.jpg,.jpeg"
                      onChange={handleUploadTrainingDoc}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['completed', 'in_progress', 'pending', 'failed'].map(status => {
                const count = (trainingQueue || []).filter(q => q.status === status).length;
                const colors: Record<string, string> = {
                  completed: 'text-emerald-500',
                  in_progress: 'text-blue-500',
                  pending: 'text-muted-foreground',
                  failed: 'text-red-500',
                };
                return (
                  <Card key={status}>
                    <CardContent className="p-3 text-center">
                      <span className={`text-2xl font-bold ${colors[status]}`}>{count}</span>
                      <p className="text-[10px] text-muted-foreground capitalize mt-1">{status.replace('_', ' ')}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Domain Knowledge Table */}
            {domainKnowledge && domainKnowledge.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Learned Domain Knowledge ({domainKnowledge.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs">Confidence</TableHead>
                        <TableHead className="text-xs">Tags</TableHead>
                        <TableHead className="text-xs">Trained</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {domainKnowledge.map(k => (
                        <TableRow key={k.id}>
                          <TableCell className="text-xs">{FRED_TRAINING_CATEGORIES.find(c => c.value === k.category)?.label || k.category}</TableCell>
                          <TableCell className="text-xs font-mono">{k.knowledge_type}</TableCell>
                          <TableCell className="text-xs max-w-[250px] truncate">{k.title}</TableCell>
                          <TableCell className="text-xs tabular-nums">
                            <span className={k.confidence >= 0.7 ? 'text-emerald-500' : k.confidence >= 0.4 ? 'text-amber-500' : 'text-red-500'}>
                              {(k.confidence * 100).toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-wrap gap-0.5">
                              {(k.tags || []).slice(0, 4).map((t, i) => (
                                <Badge key={i} variant="outline" className="text-[9px]">{t}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {new Date(k.updated_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Training Queue */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Training Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Priority</TableHead>
                      <TableHead className="text-xs">File</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(trainingQueue || []).slice(0, 50).map(q => (
                      <TableRow key={q.id}>
                        <TableCell className="text-xs tabular-nums">{q.priority}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{q.file_path.split('/').pop()}</TableCell>
                        <TableCell className="text-xs">{FRED_TRAINING_CATEGORIES.find(c => c.value === q.category)?.label || q.category}</TableCell>
                        <TableCell>
                          <Badge variant={
                            q.status === 'completed' ? 'default' :
                            q.status === 'failed' ? 'destructive' :
                            q.status === 'in_progress' ? 'secondary' : 'outline'
                          } className="text-[10px]">
                            {q.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate text-red-500">
                          {q.error_details || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!trainingQueue || trainingQueue.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                          No training documents uploaded yet — upload documents above to start training Fred
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
