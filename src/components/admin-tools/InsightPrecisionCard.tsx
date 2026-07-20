import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdminPermission } from '@/hooks/usePermissions';

interface Props {
  onBack: () => void;
}

interface Row {
  signal_id: number;
  insight_state: string | null;
  thumb_up: number;
  thumb_down: number;
  total: number;
  thumb_up_rate: number; // 0..1
}

const SIGNAL_LABELS: Record<number, string> = {
  1: 'S1 · Delivery ready',
  2: 'S2 · Overdue approval',
  3: 'S3 · Unanswered comments',
  4: 'S4 · Evidence gaps',
  5: 'S5 · Unassigned roles',
  6: 'S6 · Delivery gaps',
  7: 'S7 · Item-task lifecycle',
  8: 'S8 · Stale bundle',
  9: 'S9 · Approver ping-pong',
  10: 'S10 · Terminal drift',
};

const signalLabel = (id: number, state: string | null) => {
  const base = SIGNAL_LABELS[id] ?? `Signal ${id}`;
  return state ? `${base} · ${state}` : base;
};

const bandFor = (rate: number) => {
  if (rate >= 0.85) return { band: 'green' as const, cls: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' };
  if (rate >= 0.70) return { band: 'amber' as const, cls: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' };
  return { band: 'red' as const, cls: 'text-red-600 dark:text-red-500', bar: 'bg-red-500' };
};

export const InsightPrecisionCard: React.FC<Props> = ({ onBack }) => {
  const { isAdmin, isLoading: adminLoading } = useIsAdminPermission();

  const { data, isLoading } = useQuery({
    queryKey: ['insight-precision-by-signal'],
    enabled: isAdmin,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await (supabase as any)
        .from('insight_precision_by_signal')
        .select('signal_id, insight_state, thumb_up, thumb_down, total, thumb_up_rate');
      if (error) throw error;
      const rows = (data || []) as Row[];
      // sort by rate ascending (worst first), ties: higher total first
      return [...rows].sort((a, b) => {
        const r = Number(a.thumb_up_rate) - Number(b.thumb_up_rate);
        if (r !== 0) return r;
        return b.total - a.total;
      });
    },
  });

  if (!adminLoading && !isAdmin) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Admin access required.
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = data ?? [];
  const isEmpty = !isLoading && rows.length === 0;

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin Tools
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Insight precision · by signal · from user feedback
          </CardTitle>
          <CardDescription>
            Under 70% flagged for review. Sorted worst first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : isEmpty ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No feedback yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left font-medium py-2 pr-4">Signal</th>
                    <th className="text-right font-medium py-2 px-3">👍</th>
                    <th className="text-right font-medium py-2 px-3">👎</th>
                    <th className="text-right font-medium py-2 px-3">Rate</th>
                    <th className="text-left font-medium py-2 pl-4 w-[36%]">Precision</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const rate = Number(r.thumb_up_rate) || 0;
                    const pct = Math.round(rate * 100);
                    const { band, cls, bar } = bandFor(rate);
                    return (
                      <tr key={`${r.signal_id}-${r.insight_state ?? 'null'}-${i}`} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="py-3 pr-4 font-medium">{signalLabel(r.signal_id, r.insight_state)}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{r.thumb_up}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{r.thumb_down}</td>
                        <td className={`py-3 px-3 text-right tabular-nums font-semibold ${cls}`}>{pct}%</td>
                        <td className="py-3 pl-4">
                          {band === 'red' ? (
                            <Badge variant="outline" className="border-red-500/40 text-red-600 dark:text-red-500 gap-1">
                              <AlertTriangle className="w-3 h-3" /> review
                            </Badge>
                          ) : (
                            <div className="h-2 w-full max-w-[220px] rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full ${bar} transition-all`}
                                style={{ width: `${Math.max(4, pct)}%` }}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightPrecisionCard;
