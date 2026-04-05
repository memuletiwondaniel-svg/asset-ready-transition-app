import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`📊 Fred Performance Scorer: ${periodStart} → ${periodEnd}`);

    // Watermark check
    const { data: lastSnapshot } = await supabase
      .from('fred_kpi_snapshots').select('created_at')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    const lastScoredAt = lastSnapshot?.created_at ? new Date(lastSnapshot.created_at).getTime() : 0;
    const sixHoursAgo = now.getTime() - 6 * 60 * 60 * 1000;

    const { data: metrics, error: metricsError } = await supabase
      .from('fred_interaction_metrics').select('*')
      .gte('created_at', periodStart).lte('created_at', periodEnd);
    if (metricsError) throw metricsError;

    const total = metrics?.length || 0;
    if (total === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No Fred interactions in 7-day window', kpis: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latestInteraction = metrics!.reduce((latest: any, m: any) =>
      new Date(m.created_at).getTime() > new Date(latest.created_at).getTime() ? m : latest, metrics![0]);
    if (lastScoredAt > sixHoursAgo && new Date(latestInteraction.created_at).getTime() < lastScoredAt) {
      return new Response(JSON.stringify({ success: true, message: 'No new data since last scoring', last_scored_at: lastSnapshot?.created_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const kpis: Record<string, { value: number; sample_size: number; metadata?: any }> = {};

    // 1. Retrieval Success Rate
    const successOrPartial = metrics!.filter((m: any) => m.outcome === 'success' || m.outcome === 'partial').length;
    kpis['retrieval_success_rate'] = { value: Math.round((successOrPartial / total) * 100), sample_size: total };

    // 2. Mean Time to Answer
    const latencies = metrics!.map((m: any) => m.latency_ms).filter((l: number) => l > 0);
    kpis['mean_time_to_answer_ms'] = {
      value: latencies.length > 0 ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) : 0,
      sample_size: latencies.length
    };

    // 3. Tool Usage Distribution
    const toolDist: Record<string, number> = {};
    for (const m of metrics!) { toolDist[m.tool_used] = (toolDist[m.tool_used] || 0) + 1; }
    kpis['tool_usage_distribution'] = { value: Object.keys(toolDist).length, sample_size: total, metadata: toolDist };

    // 4. Outcome Distribution
    const outcomes: Record<string, number> = {};
    for (const m of metrics!) { outcomes[m.outcome] = (outcomes[m.outcome] || 0) + 1; }
    kpis['outcome_distribution'] = { value: total, sample_size: total, metadata: outcomes };

    // 5. Cross-Project Activity
    const projectDist: Record<string, number> = {};
    for (const m of metrics!) { if (m.project_code) projectDist[m.project_code] = (projectDist[m.project_code] || 0) + 1; }
    kpis['cross_project_activity'] = { value: Object.keys(projectDist).length, sample_size: total, metadata: projectDist };

    // 6. Certificate Coverage
    const certTools = metrics!.filter((m: any) => m.tool_used === 'get_handover_certificate_status');
    kpis['certificate_coverage'] = { value: certTools.length, sample_size: total };

    // 7. Resolution failure rate
    try {
      const { count: totalFailures } = await supabase
        .from('fred_resolution_failures').select('*', { count: 'exact', head: true }).gte('last_seen', periodStart);
      const { count: unresolvedFailures } = await supabase
        .from('fred_resolution_failures').select('*', { count: 'exact', head: true }).eq('resolved', false).gte('last_seen', periodStart);
      kpis['resolution_failure_count'] = {
        value: unresolvedFailures || 0, sample_size: totalFailures || 0,
        metadata: { unresolved: unresolvedFailures || 0, total_period: totalFailures || 0 }
      };
    } catch (e) { console.warn('Resolution failure KPI error (non-fatal):', e); }

    // Insert snapshots
    const snapshots = Object.entries(kpis).map(([name, data]) => ({
      period_start: periodStart, period_end: periodEnd, period_type: '7day',
      kpi_name: name, kpi_value: data.value, sample_size: data.sample_size, metadata: data.metadata || {}
    }));
    const { error: insertError } = await supabase.from('fred_kpi_snapshots').insert(snapshots);
    if (insertError) throw insertError;

    console.log(`✅ Fred KPIs: ${Object.keys(kpis).length} metrics from ${total} interactions`);
    return new Response(JSON.stringify({ success: true, period: { start: periodStart, end: periodEnd }, total_interactions: total, kpis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fred scorer error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
