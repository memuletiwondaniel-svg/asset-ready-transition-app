import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Shield, CheckCircle2, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { SelmaTestCard, type TestResult } from '@/components/admin/SelmaTestCard';

const TIER_LABELS: Record<number, { name: string; description: string }> = {
  0: { name: 'Identity & Routing', description: 'Fred identity, Bob routing, domain boundaries' },
  1: { name: 'GoC Connection', description: 'Credentials and connection test' },
  2: { name: 'Core Tools', description: 'Smoke tests for all 5 GoCompletions tools' },
  3: { name: 'Data Integrity', description: 'System counts, MCC records, ITR plausibility' },
  4: { name: 'Domain Knowledge', description: 'Certificate chain, punchlist categories, dossier structure' },
  5: { name: 'Negative / Edge Cases', description: 'No hallucination, read-only enforcement' },
  6: { name: 'Self-Learning', description: 'Interaction logging, resolution failures, KPI scorer' },
};

interface RunSummary {
  total: number;
  pass: number;
  fail: number;
  manual: number;
  error: number;
  total_duration_ms: number;
  go_live_ready: boolean;
}

const FredValidation: React.FC = () => {
  const { session } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [runningTier, setRunningTier] = useState<number | 'all' | null>(null);
  const [manualVerdicts, setManualVerdicts] = useState<Record<string, 'pass' | 'fail'>>({});

  const runTests = useCallback(async (tier: number | 'all') => {
    if (!session?.access_token) return;
    setRunningTier(tier);
    setResults([]);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-fred', {
        body: { tier, token: session.access_token },
      });

      if (error) throw error;
      setResults(data.tests ?? []);
      setSummary(data.summary ?? null);
    } catch (err) {
      console.error('Fred validation run failed:', err);
      setResults([{
        id: 'ERR',
        name: 'Validation run failed',
        tier: typeof tier === 'number' ? tier : -1,
        status: 'error',
        duration_ms: 0,
        details: err instanceof Error ? err.message : 'Unknown error',
        response_preview: '',
        go_live_gate: false,
      }]);
    } finally {
      setRunningTier(null);
    }
  }, [session]);

  const handleManualVerdict = useCallback((id: string, verdict: 'pass' | 'fail') => {
    setManualVerdicts(prev => ({ ...prev, [id]: verdict }));
    setResults(prev => prev.map(r =>
      r.id === id ? { ...r, status: verdict } : r
    ));
  }, []);

  const groupedResults = results.reduce<Record<number, TestResult[]>>((acc, r) => {
    if (!acc[r.tier]) acc[r.tier] = [];
    acc[r.tier].push(r);
    return acc;
  }, {});

  const isRunning = runningTier !== null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fred Validation Suite</h1>
        <p className="text-sm text-muted-foreground mt-1">
          27 tests across 7 tiers — verifying GoCompletions integration & domain knowledge
        </p>
      </div>

      {/* Run Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => runTests('all')}
              disabled={isRunning}
              className="gap-2"
            >
              {runningTier === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run All Tiers
            </Button>
            {Object.entries(TIER_LABELS).map(([t, info]) => {
              const tier = parseInt(t);
              return (
                <Button
                  key={tier}
                  variant="outline"
                  size="sm"
                  onClick={() => runTests(tier)}
                  disabled={isRunning}
                  className="gap-1.5"
                >
                  {runningTier === tier ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="font-mono text-xs">T{tier}</span>
                  )}
                  {info.name}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Bar */}
      {summary && (
        <Card className={summary.go_live_ready ? 'border-emerald-500/30' : 'border-destructive/30'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">{summary.pass} pass</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">{summary.fail} fail</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">{summary.manual} manual</span>
                </div>
                {summary.error > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">{summary.error} error</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {(summary.total_duration_ms / 1000).toFixed(1)}s total
                </span>
              </div>

              <Badge
                variant="outline"
                className={
                  summary.go_live_ready
                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400'
                    : 'bg-destructive/15 text-destructive border-destructive/30'
                }
              >
                <Shield className="h-3 w-3 mr-1" />
                {summary.go_live_ready ? 'GO-LIVE READY' : 'NOT READY'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isRunning && results.length === 0 && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Running {runningTier === 'all' ? 'all 27' : `Tier ${runningTier}`} tests...
              <br />
              <span className="text-xs">GoCompletions tests may take several minutes due to ViewState negotiation.</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results by Tier */}
      {Object.entries(groupedResults)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([tier, tests]) => {
          const tierNum = parseInt(tier);
          const tierInfo = TIER_LABELS[tierNum];
          const tierPass = tests.filter(t => t.status === 'pass').length;
          const tierTotal = tests.length;

          return (
            <Card key={tier}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Tier {tierNum} — {tierInfo?.name ?? 'Unknown'}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tierInfo?.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {tierPass}/{tierTotal}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {tests.map(result => (
                  <SelmaTestCard
                    key={result.id}
                    result={result}
                    onManualVerdict={result.status === 'manual' || manualVerdicts[result.id] ? handleManualVerdict : undefined}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
};

export default FredValidation;
