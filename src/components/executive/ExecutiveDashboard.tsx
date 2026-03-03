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

// ── Mock Data per project ──
const MOCK_PROJECTS = [
  { id: 'mock-1', project_title: 'HM Additional Compressors', project_id_prefix: 'DP', project_id_number: '300' },
  { id: 'mock-2', project_title: 'Majnoon Pipeline', project_id_prefix: 'DP', project_id_number: '317' },
  { id: 'mock-3', project_title: 'NRNGL Fire Water System', project_id_prefix: 'DP', project_id_number: '217' },
  { id: 'mock-4', project_title: 'UQ Pipelines', project_id_prefix: 'DP', project_id_number: '354' },
  { id: 'mock-5', project_title: 'West Qurna OT2/3 Gas Feed to CS6/7', project_id_prefix: 'DP', project_id_number: '385' },
];

const MOCK_PROJECT_DATA: Record<string, {
  dimensions: Record<string, any>;
  prevDimensions: Record<string, any>;
  score: any;
  history: number[];
  blockers: any[];
}> = {
  'mock-1': {
    dimensions: {
      DSN: { name: 'Design', score: 88.2, raw_score: 91.0, confidence: 0.97, risk_penalty: 1.2, total: 42, completed: 38, blocked: 0, at_risk: 2, weight: 0.25 },
      TEC: { name: 'Technical', score: 74.5, raw_score: 79.0, confidence: 0.92, risk_penalty: 3.8, total: 56, completed: 39, blocked: 3, at_risk: 5, weight: 0.25 },
      OPI: { name: 'Operating Integrity', score: 62.1, raw_score: 68.5, confidence: 0.85, risk_penalty: 5.2, total: 38, completed: 21, blocked: 4, at_risk: 6, weight: 0.20 },
      MGT: { name: 'Management Systems', score: 81.3, raw_score: 84.0, confidence: 0.95, risk_penalty: 1.5, total: 28, completed: 23, blocked: 0, at_risk: 1, weight: 0.15 },
      HSE: { name: 'Health & Safety', score: 91.6, raw_score: 93.0, confidence: 0.98, risk_penalty: 0.8, total: 34, completed: 31, blocked: 0, at_risk: 1, weight: 0.15 },
    },
    prevDimensions: { DSN: { score: 85.0 }, TEC: { score: 71.2 }, OPI: { score: 64.5 }, MGT: { score: 78.9 }, HSE: { score: 90.1 } },
    score: { overall_score: 78.4, startup_confidence_score: 71.2, risk_penalty_total: 4.8, node_count: 198, completed_count: 152, blocked_count: 7, at_risk_count: 15, confidence_level: 'medium', schedule_variance_days: -12, schedule_adherence_index: 0.88, critical_path_stability_index: 0.82 },
    history: [38.0, 44.5, 52.0, 58.2, 65.8, 71.3, 75.1, 78.4],
    blockers: [
      { id: 'b1', label: 'Compressor C-4102 Vendor Data Package Outstanding', module: 'ORA', status: 'blocked', risk_severity: 'startup_blocking', completion_pct: 15 },
      { id: 'b2', label: 'HAZOP Close-out Actions — Flare KO Drum Sizing', module: 'PSSR', status: 'blocked', risk_severity: 'startup_blocking', completion_pct: 0 },
      { id: 'b3', label: 'SIS Cause & Effect Matrix — Final Approval Pending', module: 'ORM', status: 'blocked', risk_severity: 'major', completion_pct: 72 },
      { id: 'b4', label: 'Ops Training Batch 2 — Delayed Due to Instructor Availability', module: 'ORA', status: 'blocked', risk_severity: 'major', completion_pct: 30 },
      { id: 'b5', label: 'EDP-4101 — Material Lead Time Exceeded', module: 'P2A', status: 'blocked', risk_severity: 'major', completion_pct: 45 },
    ],
  },
  'mock-2': {
    dimensions: {
      DSN: { name: 'Design', score: 94.1, raw_score: 95.5, confidence: 0.99, risk_penalty: 0.5, total: 30, completed: 29, blocked: 0, at_risk: 0, weight: 0.25 },
      TEC: { name: 'Technical', score: 87.3, raw_score: 89.0, confidence: 0.96, risk_penalty: 1.2, total: 44, completed: 39, blocked: 1, at_risk: 2, weight: 0.25 },
      OPI: { name: 'Operating Integrity', score: 79.8, raw_score: 82.0, confidence: 0.93, risk_penalty: 2.1, total: 32, completed: 26, blocked: 1, at_risk: 2, weight: 0.20 },
      MGT: { name: 'Management Systems', score: 88.5, raw_score: 90.0, confidence: 0.97, risk_penalty: 0.8, total: 22, completed: 20, blocked: 0, at_risk: 1, weight: 0.15 },
      HSE: { name: 'Health & Safety', score: 92.0, raw_score: 93.5, confidence: 0.99, risk_penalty: 0.4, total: 17, completed: 16, blocked: 0, at_risk: 0, weight: 0.15 },
    },
    prevDimensions: { DSN: { score: 91.8 }, TEC: { score: 84.0 }, OPI: { score: 76.5 }, MGT: { score: 86.2 }, HSE: { score: 91.0 } },
    score: { overall_score: 86.7, startup_confidence_score: 84.1, risk_penalty_total: 2.1, node_count: 145, completed_count: 130, blocked_count: 2, at_risk_count: 5, confidence_level: 'high', schedule_variance_days: -3, schedule_adherence_index: 0.96, critical_path_stability_index: 0.94 },
    history: [45.0, 53.2, 61.8, 69.4, 75.0, 80.2, 84.0, 86.7],
    blockers: [
      { id: 'b1', label: 'Pipeline coating inspection report delayed', module: 'ORM', status: 'blocked', risk_severity: 'major', completion_pct: 60 },
      { id: 'b2', label: 'Tie-in schedule conflict with live operations', module: 'P2A', status: 'blocked', risk_severity: 'major', completion_pct: 25 },
    ],
  },
  'mock-3': {
    dimensions: {
      DSN: { name: 'Design', score: 55.2, raw_score: 62.0, confidence: 0.82, risk_penalty: 6.8, total: 48, completed: 25, blocked: 5, at_risk: 8, weight: 0.25 },
      TEC: { name: 'Technical', score: 48.7, raw_score: 56.0, confidence: 0.78, risk_penalty: 7.5, total: 62, completed: 28, blocked: 8, at_risk: 10, weight: 0.25 },
      OPI: { name: 'Operating Integrity', score: 42.3, raw_score: 50.0, confidence: 0.75, risk_penalty: 8.2, total: 45, completed: 17, blocked: 6, at_risk: 9, weight: 0.20 },
      MGT: { name: 'Management Systems', score: 68.5, raw_score: 72.0, confidence: 0.88, risk_penalty: 3.5, total: 35, completed: 23, blocked: 2, at_risk: 4, weight: 0.15 },
      HSE: { name: 'Health & Safety', score: 71.0, raw_score: 75.0, confidence: 0.90, risk_penalty: 2.8, total: 30, completed: 21, blocked: 1, at_risk: 3, weight: 0.15 },
    },
    prevDimensions: { DSN: { score: 53.0 }, TEC: { score: 50.2 }, OPI: { score: 44.8 }, MGT: { score: 65.1 }, HSE: { score: 69.5 } },
    score: { overall_score: 54.3, startup_confidence_score: 42.8, risk_penalty_total: 11.2, node_count: 220, completed_count: 114, blocked_count: 22, at_risk_count: 34, confidence_level: 'low', schedule_variance_days: -45, schedule_adherence_index: 0.65, critical_path_stability_index: 0.52 },
    history: [20.0, 25.5, 30.8, 36.2, 41.0, 46.5, 51.0, 54.3],
    blockers: [
      { id: 'b1', label: 'Fire water pump P-2201 factory test failure — re-test pending', module: 'ORA', status: 'blocked', risk_severity: 'startup_blocking', completion_pct: 10 },
      { id: 'b2', label: 'Deluge system hydraulic model — design revision required', module: 'ORM', status: 'blocked', risk_severity: 'startup_blocking', completion_pct: 35 },
      { id: 'b3', label: 'Fire detection loop wiring — cable tray routing clash', module: 'P2A', status: 'blocked', risk_severity: 'startup_blocking', completion_pct: 20 },
      { id: 'b4', label: 'Firewater storage tank T-2201 foundation rework', module: 'ORA', status: 'blocked', risk_severity: 'major', completion_pct: 55 },
      { id: 'b5', label: 'NFPA compliance gap — foam system design not finalised', module: 'PSSR', status: 'blocked', risk_severity: 'major', completion_pct: 40 },
    ],
  },
  'mock-4': {
    dimensions: {
      DSN: { name: 'Design', score: 96.0, raw_score: 97.0, confidence: 0.99, risk_penalty: 0.3, total: 25, completed: 25, blocked: 0, at_risk: 0, weight: 0.25 },
      TEC: { name: 'Technical', score: 91.5, raw_score: 92.8, confidence: 0.98, risk_penalty: 0.6, total: 32, completed: 30, blocked: 0, at_risk: 1, weight: 0.25 },
      OPI: { name: 'Operating Integrity', score: 88.2, raw_score: 90.0, confidence: 0.96, risk_penalty: 1.0, total: 20, completed: 18, blocked: 0, at_risk: 1, weight: 0.20 },
      MGT: { name: 'Management Systems', score: 93.0, raw_score: 94.0, confidence: 0.98, risk_penalty: 0.4, total: 15, completed: 14, blocked: 0, at_risk: 0, weight: 0.15 },
      HSE: { name: 'Health & Safety', score: 95.8, raw_score: 96.5, confidence: 0.99, risk_penalty: 0.2, total: 12, completed: 12, blocked: 0, at_risk: 0, weight: 0.15 },
    },
    prevDimensions: { DSN: { score: 94.5 }, TEC: { score: 89.0 }, OPI: { score: 85.5 }, MGT: { score: 91.2 }, HSE: { score: 94.5 } },
    score: { overall_score: 92.1, startup_confidence_score: 90.5, risk_penalty_total: 1.0, node_count: 104, completed_count: 99, blocked_count: 0, at_risk_count: 2, confidence_level: 'high', schedule_variance_days: 5, schedule_adherence_index: 0.99, critical_path_stability_index: 0.97 },
    history: [52.0, 60.5, 70.2, 77.8, 82.5, 86.8, 90.0, 92.1],
    blockers: [],
  },
  'mock-5': {
    dimensions: {
      DSN: { name: 'Design', score: 72.5, raw_score: 77.0, confidence: 0.90, risk_penalty: 3.5, total: 55, completed: 38, blocked: 2, at_risk: 5, weight: 0.25 },
      TEC: { name: 'Technical', score: 65.8, raw_score: 72.0, confidence: 0.87, risk_penalty: 5.0, total: 68, completed: 42, blocked: 5, at_risk: 8, weight: 0.25 },
      OPI: { name: 'Operating Integrity', score: 58.4, raw_score: 65.0, confidence: 0.82, risk_penalty: 6.2, total: 50, completed: 27, blocked: 4, at_risk: 7, weight: 0.20 },
      MGT: { name: 'Management Systems', score: 75.0, raw_score: 78.0, confidence: 0.92, risk_penalty: 2.0, total: 30, completed: 22, blocked: 1, at_risk: 3, weight: 0.15 },
      HSE: { name: 'Health & Safety', score: 82.3, raw_score: 85.0, confidence: 0.95, risk_penalty: 1.5, total: 28, completed: 23, blocked: 0, at_risk: 2, weight: 0.15 },
    },
    prevDimensions: { DSN: { score: 69.0 }, TEC: { score: 62.5 }, OPI: { score: 55.0 }, MGT: { score: 72.8 }, HSE: { score: 80.0 } },
    score: { overall_score: 69.5, startup_confidence_score: 61.3, risk_penalty_total: 7.2, node_count: 231, completed_count: 152, blocked_count: 12, at_risk_count: 25, confidence_level: 'medium', schedule_variance_days: -22, schedule_adherence_index: 0.80, critical_path_stability_index: 0.72 },
    history: [28.0, 35.5, 42.0, 49.8, 55.2, 60.5, 65.8, 69.5],
    blockers: [
      { id: 'b1', label: 'Gas feed tie-in permit — regulatory approval pending', module: 'P2A', status: 'blocked', risk_severity: 'startup_blocking', completion_pct: 5 },
      { id: 'b2', label: 'CS6 compressor rotor balancing — vendor rework', module: 'ORA', status: 'blocked', risk_severity: 'startup_blocking', completion_pct: 40 },
      { id: 'b3', label: 'Pipeline pigging launcher — fabrication delay', module: 'ORM', status: 'blocked', risk_severity: 'major', completion_pct: 50 },
      { id: 'b4', label: 'Gas metering skid calibration — instrument delivery late', module: 'ORA', status: 'blocked', risk_severity: 'major', completion_pct: 20 },
      { id: 'b5', label: 'CS7 control narrative — DCS vendor review outstanding', module: 'ORM', status: 'blocked', risk_severity: 'major', completion_pct: 65 },
    ],
  },
};

// Helper to build mock data for selected project
function getMockDataForProject(projectId: string) {
  const data = MOCK_PROJECT_DATA[projectId];
  if (!data) return null;
  const baseScore = {
    id: `score-${projectId}`,
    project_id: projectId,
    ...data.score,
    calculated_at: new Date().toISOString(),
    dimension_scores: data.dimensions,
  };
  const history = data.history.map((s, i) => ({
    ...baseScore,
    id: `s-${projectId}-${i}`,
    overall_score: s,
    startup_confidence_score: s * (data.score.startup_confidence_score / data.score.overall_score),
    calculated_at: new Date(Date.now() - (data.history.length - 1 - i) * 7 * 86400000).toISOString(),
    dimension_scores: i === data.history.length - 1 ? data.dimensions : (i === data.history.length - 2 ? data.prevDimensions : data.dimensions),
  }));
  return { latestScore: baseScore, history, blockers: data.blockers };
}

const MOCK_ALL_SCORES = MOCK_PROJECTS.map((p) => {
  const d = MOCK_PROJECT_DATA[p.id];
  return {
    id: `as-${p.id}`,
    project_id: p.id,
    overall_score: d?.score.overall_score || 0,
    startup_confidence_score: d?.score.startup_confidence_score || 0,
    node_count: d?.score.node_count || 0,
    confidence_level: d?.score.confidence_level || 'low',
    calculated_at: new Date(Date.now() - Math.random() * 3 * 86400000).toISOString(),
    projects: p,
  };
});

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onBack }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>('mock-1');
  const [useMockData, setUseMockData] = useState(true);
  const syncMutation = useSyncReadinessNodes();
  const calculateMutation = useCalculateORI();
  const { data: categories = [] } = useVCRItemCategories();

  const { data: realProjects = [] } = useQuery({
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

  const { data: realAllScores = [], isLoading: scoresLoading } = useAllProjectORIScores();
  const { data: realNodes = [] } = useReadinessNodes(useMockData ? undefined : selectedProjectId);
  const { data: realLatestScore } = useLatestORIScore(useMockData ? undefined : selectedProjectId);
  const { data: realScoreHistory = [] } = useORIScores(useMockData ? undefined : selectedProjectId);

  // Use mock or real data
  const projects = useMockData ? MOCK_PROJECTS : realProjects;
  const allScores = useMockData ? MOCK_ALL_SCORES : realAllScores;
  const mockProjectData = useMockData && selectedProjectId ? getMockDataForProject(selectedProjectId) : null;
  const nodes = useMockData ? (mockProjectData?.blockers || []) : realNodes;
  const latestScore = useMockData ? (mockProjectData?.latestScore || null) : realLatestScore;
  const scoreHistory = useMockData ? (mockProjectData?.history || []) : realScoreHistory;

  const handleSyncAndCalculate = async (projectId: string) => {
    if (useMockData) return;
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
    const latest = (scoreHistory[0] as any)?.dimension_scores as Record<string, any> || {};
    const prev = (scoreHistory[1] as any)?.dimension_scores as Record<string, any> || {};
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
    return (nodes as any[])
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
      .map((s: any) => ({
        date: format(new Date(s.calculated_at), 'MMM d'),
        score: Number(s.overall_score),
        scs: Number(s.startup_confidence_score || 0),
        target: 85,
      }));
  }, [scoreHistory]);

  // Risk summary stats
  const riskSummary = useMemo(() => {
    const blockedNodes = (nodes as any[]).filter(n => n.status === 'blocked' || n.risk_severity === 'major' || n.risk_severity === 'startup_blocking');
    const startupBlocking = (nodes as any[]).filter(n => n.risk_severity === 'startup_blocking');
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

  const oriScore = latestScore ? Number((latestScore as any).overall_score) : 0;
  const scsScore = latestScore ? Number((latestScore as any).startup_confidence_score || 0) : 0;
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
            <Button
              variant={useMockData ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setUseMockData(!useMockData); setSelectedProjectId(useMockData ? null : 'mock-1'); }}
              className="text-xs h-8"
            >
              {useMockData ? '📊 Demo Data' : 'Live Data'}
            </Button>
            <Select value={selectedProjectId || ''} onValueChange={(v) => setSelectedProjectId(v || null)}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a project for drill-down" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_id_prefix}{p.project_id_number} — {p.project_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProjectId && !useMockData && (
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
            {scoresLoading && !useMockData ? (
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
