import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const periodEnd = now.toISOString();
    // Rolling 7-day window to handle low-usage periods
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`📊 Selma Performance Scorer running for ${periodStart} → ${periodEnd} (7-day window)`);

    // Watermark check: skip if we already scored within the last 6 hours and no new data
    const { data: lastSnapshot } = await supabase
      .from('selma_kpi_snapshots')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const lastScoredAt = lastSnapshot?.created_at ? new Date(lastSnapshot.created_at).getTime() : 0;
    const sixHoursAgo = now.getTime() - 6 * 60 * 60 * 1000;

    // Fetch all Selma interactions in the period
    const { data: metrics, error: metricsError } = await supabase
      .from('selma_interaction_metrics')
      .select('*')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    if (metricsError) throw metricsError;

    const total = metrics?.length || 0;
    if (total === 0) {
      console.log('No Selma interactions in 7-day window — skipping KPI computation');
      return new Response(JSON.stringify({ success: true, message: 'No data in 7-day window', kpis: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if data has changed since last scoring
    const latestInteraction = metrics!.reduce((latest: any, m: any) => 
      new Date(m.created_at).getTime() > new Date(latest.created_at).getTime() ? m : latest
    , metrics![0]);
    const latestInteractionTime = new Date(latestInteraction.created_at).getTime();
    
    if (lastScoredAt > sixHoursAgo && latestInteractionTime < lastScoredAt) {
      console.log('No new interactions since last scoring — skipping');
      return new Response(JSON.stringify({ success: true, message: 'No new data since last scoring', last_scored_at: lastSnapshot?.created_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute KPIs
    const kpis: Record<string, { value: number; sample_size: number; metadata?: any }> = {};

    // 1. Document Retrieval Success Rate
    const successOrPartial = metrics!.filter((m: any) => m.outcome === 'success' || m.outcome === 'partial').length;
    kpis['retrieval_success_rate'] = { value: Math.round((successOrPartial / total) * 100), sample_size: total };

    // 2. First-Stage Hit Rate
    const searches = metrics!.filter((m: any) => m.cascade_depth > 0);
    const firstStageHits = searches.filter((m: any) => m.cascade_depth === 1).length;
    kpis['first_stage_hit_rate'] = {
      value: searches.length > 0 ? Math.round((firstStageHits / searches.length) * 100) : 0,
      sample_size: searches.length
    };

    // 3. Mean Time to Answer
    const latencies = metrics!.map((m: any) => m.total_latency_ms).filter((l: number) => l > 0);
    kpis['mean_time_to_answer_ms'] = {
      value: latencies.length > 0 ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) : 0,
      sample_size: latencies.length
    };

    // 4. Download Success Rate
    const downloadAttempted = metrics!.filter((m: any) => m.download_attempted);
    const downloadSucceeded = downloadAttempted.filter((m: any) => m.download_success).length;
    kpis['download_success_rate'] = {
      value: downloadAttempted.length > 0 ? Math.round((downloadSucceeded / downloadAttempted.length) * 100) : 100,
      sample_size: downloadAttempted.length
    };

    // 5. Analysis Completion Rate
    const downloadSuccess = metrics!.filter((m: any) => m.download_success);
    const analysisComplete = downloadSuccess.filter((m: any) => m.analysis_completed).length;
    kpis['analysis_completion_rate'] = {
      value: downloadSuccess.length > 0 ? Math.round((analysisComplete / downloadSuccess.length) * 100) : 100,
      sample_size: downloadSuccess.length
    };

    // 6. User Satisfaction Index (from feedback)
    const withFeedback = metrics!.filter((m: any) => m.user_feedback);
    const positive = withFeedback.filter((m: any) => m.user_feedback === 'positive').length;
    kpis['user_satisfaction_index'] = {
      value: withFeedback.length > 0 ? Math.round((positive / withFeedback.length) * 100) : 0,
      sample_size: withFeedback.length
    };

    // 7. Strategy Efficiency Score
    const avgCascade = searches.length > 0
      ? searches.reduce((a: number, m: any) => a + m.cascade_depth, 0) / searches.length
      : 1;
    kpis['strategy_efficiency'] = {
      value: Math.round((1 / avgCascade) * 100),
      sample_size: searches.length
    };

    // 8. Outcome distribution
    const outcomes: Record<string, number> = {};
    for (const m of metrics!) {
      outcomes[m.outcome] = (outcomes[m.outcome] || 0) + 1;
    }
    kpis['outcome_distribution'] = {
      value: total,
      sample_size: total,
      metadata: outcomes
    };

    // 9. Mean search latency
    const searchLatencies = metrics!.map((m: any) => m.search_latency_ms).filter((l: number) => l > 0);
    kpis['mean_search_latency_ms'] = {
      value: searchLatencies.length > 0 ? Math.round(searchLatencies.reduce((a: number, b: number) => a + b, 0) / searchLatencies.length) : 0,
      sample_size: searchLatencies.length
    };

    // 10. Mean download latency
    const dlLatencies = metrics!.map((m: any) => m.download_latency_ms).filter((l: number) => l > 0);
    kpis['mean_download_latency_ms'] = {
      value: dlLatencies.length > 0 ? Math.round(dlLatencies.reduce((a: number, b: number) => a + b, 0) / dlLatencies.length) : 0,
      sample_size: dlLatencies.length
    };

    // 11. Cascade depth distribution (which strategy levels resolve queries)
    const depthDist: Record<number, { total: number; success: number }> = {};
    for (const m of metrics!) {
      const depth = m.cascade_depth || 1;
      if (!depthDist[depth]) depthDist[depth] = { total: 0, success: 0 };
      depthDist[depth].total++;
      if (m.outcome === 'success' || m.outcome === 'partial') depthDist[depth].success++;
    }
    kpis['cascade_depth_distribution'] = {
      value: Object.keys(depthDist).length,
      sample_size: total,
      metadata: depthDist
    };

    // 12. Resolution failure rate (from selma_resolution_failures table)
    try {
      const { count: totalFailures } = await supabase
        .from('selma_resolution_failures')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', periodStart);
      
      const { count: unresolvedFailures } = await supabase
        .from('selma_resolution_failures')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .gte('last_seen', periodStart);

      kpis['resolution_failure_count'] = {
        value: unresolvedFailures || 0,
        sample_size: totalFailures || 0,
        metadata: { unresolved: unresolvedFailures || 0, total_period: totalFailures || 0 }
      };

      // Auto-suggest acronyms: failures with 3+ occurrences → insert as learned strategy suggestions
      const { data: frequentFailures } = await supabase
        .from('selma_resolution_failures')
        .select('cleaned_query, levenshtein_top3, occurrence_count')
        .eq('resolved', false)
        .gte('occurrence_count', 3)
        .order('occurrence_count', { ascending: false })
        .limit(10);

      if (frequentFailures && frequentFailures.length > 0) {
        for (const f of frequentFailures) {
          const top3 = f.levenshtein_top3 || [];
          if (top3.length > 0) {
            // Check if suggestion already exists
            const { data: existing } = await supabase
              .from('selma_learned_strategies')
              .select('id')
              .eq('strategy_type', 'acronym_suggestion')
              .eq('trigger_pattern', f.cleaned_query)
              .maybeSingle();

            if (!existing) {
              await supabase.from('selma_learned_strategies').insert({
                strategy_type: 'acronym_suggestion',
                trigger_pattern: f.cleaned_query,
                learned_value: { suggested_matches: top3, occurrence_count: f.occurrence_count },
                confidence: 0.5,
                times_applied: 0,
                success_rate: 0,
                source: 'auto_scorer',
                is_active: false,
              });
              console.log(`📝 Auto-suggested acronym strategy for "${f.cleaned_query}" (${f.occurrence_count} failures)`);
            }
          }
        }
      }
    } catch (resErr) {
      console.warn('Resolution failure KPI computation error (non-fatal):', resErr);
    }

    // Insert all KPI snapshots
    const snapshots = Object.entries(kpis).map(([name, data]) => ({
      period_start: periodStart,
      period_end: periodEnd,
      kpi_name: name,
      kpi_value: data.value,
      sample_size: data.sample_size,
      metadata: data.metadata || {}
    }));

    const { error: insertError } = await supabase
      .from('selma_kpi_snapshots')
      .insert(snapshots);

    if (insertError) throw insertError;

    console.log(`✅ Selma KPIs computed: ${Object.keys(kpis).length} metrics from ${total} interactions`);

    return new Response(JSON.stringify({
      success: true,
      period: { start: periodStart, end: periodEnd },
      total_interactions: total,
      kpis
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Selma scorer error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
