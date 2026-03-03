import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Activity, CheckCircle, XCircle, Clock, TrendingUp, Loader2, BarChart3, Zap } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface IntegrationHealthProps {
  onBack: () => void;
}

interface LogEntry {
  api_key_id: string | null;
  endpoint: string;
  method: string;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

interface KeyInfo {
  id: string;
  name: string;
  integration_type: string;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)', 'hsl(45, 93%, 47%)'];

const IntegrationHealth: React.FC<IntegrationHealthProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedKey, setSelectedKey] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const hoursMap: Record<string, number> = { '1h': 1, '6h': 6, '24h': 24, '7d': 168, '30d': 720 };
    const since = new Date(Date.now() - (hoursMap[timeRange] || 24) * 3600000).toISOString();

    const [{ data: logData }, { data: keyData }] = await Promise.all([
      supabase.from('api_request_logs' as any).select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
      supabase.from('api_keys' as any).select('id, name, integration_type').eq('is_active', true),
    ]);
    if (logData) setLogs(logData as any);
    if (keyData) setKeys(keyData as any);
    setLoading(false);
  }, [timeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = selectedKey === 'all' ? logs : logs.filter(l => l.api_key_id === selectedKey);
  const totalRequests = filtered.length;
  const successCount = filtered.filter(l => l.status_code && l.status_code >= 200 && l.status_code < 400).length;
  const errorCount = filtered.filter(l => l.status_code && l.status_code >= 400).length;
  const avgResponseTime = filtered.length > 0
    ? Math.round(filtered.reduce((s, l) => s + (l.response_time_ms || 0), 0) / filtered.length)
    : 0;
  const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 0;

  // Hourly distribution for bar chart
  const hourlyData = (() => {
    const buckets: Record<string, { hour: string; success: number; error: number }> = {};
    filtered.forEach(l => {
      const hour = format(new Date(l.created_at), 'HH:00');
      if (!buckets[hour]) buckets[hour] = { hour, success: 0, error: 0 };
      if (l.status_code && l.status_code < 400) buckets[hour].success++;
      else buckets[hour].error++;
    });
    return Object.values(buckets).sort((a, b) => a.hour.localeCompare(b.hour));
  })();

  // Per-integration breakdown
  const integrationData = (() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => {
      const key = keys.find(k => k.id === l.api_key_id);
      const name = key?.name || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // Recent errors
  const recentErrors = filtered.filter(l => l.status_code && l.status_code >= 400).slice(0, 10);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4 shrink-0">
        <BreadcrumbNavigation currentPageLabel="Integration Health" favoritePath="/admin-tools/integration-health" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Integration Health
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Monitor API call success rates, latency, and errors</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Integrations</SelectItem>
                {keys.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="6h">6 hours</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /></div>
            <p className="text-2xl font-bold mt-1">{totalRequests.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /></div>
            <p className="text-2xl font-bold mt-1">{successRate}%</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /></div>
            <p className="text-2xl font-bold mt-1">{errorCount}</p>
            <p className="text-xs text-muted-foreground">Errors</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /></div>
            <p className="text-2xl font-bold mt-1">{avgResponseTime}ms</p>
            <p className="text-xs text-muted-foreground">Avg Response Time</p>
          </CardContent></Card>
        </div>

        {/* Charts */}
        {hourlyData.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Request Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="hour" className="text-[10px]" />
                    <YAxis className="text-[10px]" />
                    <ReTooltip contentStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="success" fill="hsl(142, 71%, 45%)" name="Success" stackId="a" />
                    <Bar dataKey="error" fill="hsl(0, 84%, 60%)" name="Error" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            {integrationData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">By Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={integrationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e) => e.name} className="text-[10px]">
                        {integrationData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Recent errors */}
        {recentErrors.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Errors</CardTitle>
              <CardDescription className="text-xs">Last {recentErrors.length} failed requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentErrors.map((err, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs bg-destructive/5 border border-destructive/10">
                    <Badge variant="destructive" className="text-[10px]">{err.status_code}</Badge>
                    <span className="font-mono text-muted-foreground">{err.method} {err.endpoint}</span>
                    <span className="text-destructive flex-1 truncate">{err.error_message || 'Unknown error'}</span>
                    <span className="text-muted-foreground">{format(new Date(err.created_at), 'HH:mm:ss')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {totalRequests === 0 && (
          <Card><CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">No API requests recorded</p>
            <p className="text-xs text-muted-foreground mt-1">Request data will appear here once external integrations start using API keys</p>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default IntegrationHealth;
