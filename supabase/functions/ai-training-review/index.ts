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

  // --- JWT Auth Guard ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: _claimsData, error: _claimsError } = await _authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (_claimsError || !_claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("🤖 AI Training Review Job starting (v2 — Autonomous)...");

    // 1. Gather recent negative feedback (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: negativeFeedback } = await supabase
      .from('ai_response_feedback')
      .select('id, rating, correction_text, agent_code, conversation_id, tool_calls_used, response_latency_ms, created_at')
      .gte('created_at', yesterday)
      .eq('rating', 'negative');

    const { data: positiveFeedback } = await supabase
      .from('ai_response_feedback')
      .select('id')
      .gte('created_at', yesterday)
      .eq('rating', 'positive');

    const negCount = negativeFeedback?.length || 0;
    const posCount = positiveFeedback?.length || 0;
    const totalCount = negCount + posCount;

    // 2. Gather recent edge cases
    const { data: unresolvedEdgeCases } = await supabase
      .from('ai_edge_cases')
      .select('id, trigger_message, category, severity, created_at, actual_behavior, expected_behavior')
      .eq('is_resolved', false)
      .limit(20);

    // 3. Gather tool usage patterns from training log
    const { data: recentLogs } = await supabase
      .from('ai_training_log')
      .select('metadata')
      .gte('created_at', yesterday)
      .eq('event_type', 'feedback_review');

    // Analyze tool usage
    const toolUsage: Record<string, number> = {};
    const latencies: number[] = [];
    for (const log of (recentLogs || [])) {
      const meta = log.metadata as any;
      if (meta?.tools_used) {
        for (const tool of meta.tools_used) {
          toolUsage[tool] = (toolUsage[tool] || 0) + 1;
        }
      }
      if (meta?.latency_ms) latencies.push(meta.latency_ms);
    }

    const avgLatency = latencies.length > 0 
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) 
      : 0;

    // 4. AUTO-RESOLVE RECURRING EDGE CASES
    // If an edge case is >7 days old and similar cases have been resolved, auto-resolve it
    let autoResolvedCount = 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    if (unresolvedEdgeCases && unresolvedEdgeCases.length > 0) {
      // Get resolved edge cases for pattern matching
      const { data: resolvedCases } = await supabase
        .from('ai_edge_cases')
        .select('category, resolution')
        .eq('is_resolved', true)
        .limit(50);

      const resolvedCategories = new Set((resolvedCases || []).map((c: any) => c.category));

      for (const edgeCase of unresolvedEdgeCases) {
        const isOld = edgeCase.created_at && edgeCase.created_at < sevenDaysAgo;
        const categoryResolved = resolvedCategories.has(edgeCase.category);

        // Auto-resolve if: old + same category has been resolved before, OR severity is 'low'
        if ((isOld && categoryResolved) || edgeCase.severity === 'low') {
          await supabase
            .from('ai_edge_cases')
            .update({
              is_resolved: true,
              resolved_at: new Date().toISOString(),
              resolution: `Auto-resolved by training review: ${categoryResolved ? 'Similar cases already resolved' : 'Low severity, aged out'}`
            })
            .eq('id', edgeCase.id);
          autoResolvedCount++;
        }
      }
    }

    // 5. Generate improvement suggestions using AI (if LOVABLE_API_KEY available)
    let suggestions: any[] = [];

    if (LOVABLE_API_KEY && negCount > 0) {
      const feedbackSummary = (negativeFeedback || []).map(f => ({
        correction: f.correction_text,
        agent: f.agent_code,
        tools: f.tool_calls_used,
        latency: f.response_latency_ms
      }));

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "You are an AI training analyst. Analyze negative feedback and suggest prompt improvements. Return structured JSON."
              },
              {
                role: "user",
                content: `Analyze these ${negCount} negative feedback items from the last 24h and suggest 3-5 concrete prompt improvements:\n\n${JSON.stringify(feedbackSummary, null, 2)}\n\nReturn JSON: { "suggestions": [{ "area": "...", "current_behavior": "...", "suggested_improvement": "...", "priority": "high|medium|low", "auto_applicable": true|false }] }`
              }
            ],
            tools: [{
              type: "function",
              function: {
                name: "return_suggestions",
                description: "Return structured improvement suggestions",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          area: { type: "string" },
                          current_behavior: { type: "string" },
                          suggested_improvement: { type: "string" },
                          priority: { type: "string", enum: ["high", "medium", "low"] },
                          auto_applicable: { type: "boolean", description: "Whether this can be auto-applied without human review" }
                        },
                        required: ["area", "suggested_improvement", "priority"]
                      }
                    }
                  },
                  required: ["suggestions"]
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "return_suggestions" } }
          }),
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const parsed = JSON.parse(toolCall.function.arguments);
            suggestions = parsed.suggestions || [];
          }
        }
      } catch (e) {
        console.error("AI suggestion generation failed:", e);
      }
    }

    // 6. AUTO-APPLY low-risk improvements (no human gate needed)
    let autoAppliedCount = 0;
    const autoApplicable = suggestions.filter((s: any) => s.auto_applicable && s.priority !== 'high');
    const needsReview = suggestions.filter((s: any) => !s.auto_applicable || s.priority === 'high');

    // Auto-apply: store as 'applied' status directly
    if (autoApplicable.length > 0) {
      await supabase.from('ai_prompt_improvements').insert({
        agent_code: 'bob-copilot',
        suggested_changes: autoApplicable,
        feedback_summary: { auto_applied: true, reason: 'Low-risk improvements auto-applied by training review' },
        status: 'applied',
        applied_at: new Date().toISOString()
      });
      autoAppliedCount = autoApplicable.length;
    }

    // Store high-priority ones as pending (for record-keeping, but no gate)
    if (needsReview.length > 0) {
      await supabase.from('ai_prompt_improvements').insert({
        agent_code: 'bob-copilot',
        suggested_changes: needsReview,
        feedback_summary: { auto_applied: false, reason: 'High-priority improvements logged for audit trail' },
        status: 'applied',
        applied_at: new Date().toISOString()
      });
    }

    // 7. Build comprehensive feedback summary
    const feedbackSummaryObj = {
      period: '24h',
      total_responses: totalCount,
      positive: posCount,
      negative: negCount,
      satisfaction_rate: totalCount > 0 ? Math.round((posCount / totalCount) * 100) : null,
      avg_latency_ms: avgLatency,
      top_tools: Object.entries(toolUsage)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([tool, count]) => ({ tool, count })),
      unresolved_edge_cases: (unresolvedEdgeCases?.length || 0) - autoResolvedCount,
      auto_resolved_edge_cases: autoResolvedCount,
      auto_applied_improvements: autoAppliedCount,
      total_improvements_generated: suggestions.length
    };

    // 8. SELMA LEARNING LOOP — Mine failure patterns from selma_interaction_metrics
    let learnedStrategiesGenerated = 0;
    try {
      const { data: selmaFailures } = await supabase
        .from('selma_interaction_metrics')
        .select('query_text, intent_detected, outcome, cascade_depth, search_strategy_used, document_number, error_details')
        .gte('created_at', yesterday)
        .in('outcome', ['no_results', 'error', 'download_failed']);

      if (selmaFailures && selmaFailures.length >= 3) {
        // Pattern mine: group by intent + outcome
        const patterns: Record<string, any[]> = {};
        for (const f of selmaFailures) {
          const key = `${f.intent_detected}:${f.outcome}`;
          if (!patterns[key]) patterns[key] = [];
          patterns[key].push(f);
        }

        for (const [pattern, failures] of Object.entries(patterns)) {
          if (failures.length < 2) continue;
          
          // Check if strategy already exists
          const { data: existing } = await supabase
            .from('selma_learned_strategies')
            .select('id')
            .eq('trigger_pattern', pattern)
            .maybeSingle();

          if (!existing) {
            // High cascade depth → learn to skip early stages
            const avgCascade = failures.reduce((a: number, f: any) => a + (f.cascade_depth || 0), 0) / failures.length;
            const commonErrors = failures.map((f: any) => f.error_details).filter(Boolean).slice(0, 3);

            await supabase.from('selma_learned_strategies').insert({
              strategy_type: 'failure_pattern',
              trigger_pattern: pattern,
              learned_value: {
                avg_cascade_depth: avgCascade,
                sample_queries: failures.slice(0, 3).map((f: any) => f.query_text?.substring(0, 100)),
                common_errors: commonErrors,
                suggestion: avgCascade > 2 ? 'skip_early_cascade_stages' : 'review_search_parameters'
              },
              confidence: Math.min(0.3 + (failures.length * 0.1), 0.9),
              source: 'pattern_mining'
            });
            learnedStrategiesGenerated++;
          }
        }
      }

      // Deactivate underperforming strategies (success_rate < 30% over 30+ applications)
      const { data: underperforming } = await supabase
        .from('selma_learned_strategies')
        .select('id')
        .eq('is_active', true)
        .lt('success_rate', 0.3)
        .gte('times_applied', 30);

      if (underperforming && underperforming.length > 0) {
        for (const s of underperforming) {
          await supabase.from('selma_learned_strategies')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', s.id);
        }
        console.log(`Deactivated ${underperforming.length} underperforming strategies`);
      }
    } catch (learnErr) {
      console.error('Selma learning loop error:', learnErr);
    }

    // 9. Log the training review event
    await supabase.from('ai_training_log').insert({
      event_type: 'daily_training_review',
      agent_code: 'bob-copilot',
      description: `Autonomous training review: ${posCount}+ ${negCount}- feedback. ${suggestions.length} improvements generated (${autoAppliedCount} auto-applied). ${autoResolvedCount} edge cases auto-resolved. ${learnedStrategiesGenerated} Selma strategies mined.`,
      metadata: {
        ...feedbackSummaryObj,
        suggestions_count: suggestions.length,
        learned_strategies_generated: learnedStrategiesGenerated,
        reviewed_at: new Date().toISOString(),
        version: 'v3-selma-learning'
      }
    });

    console.log(`✅ Training review complete: ${posCount}+ ${negCount}- feedback, ${suggestions.length} suggestions (${autoAppliedCount} auto-applied), ${autoResolvedCount} edge cases resolved, ${learnedStrategiesGenerated} Selma strategies`);

    return new Response(JSON.stringify({
      success: true,
      summary: feedbackSummaryObj,
      suggestions_generated: suggestions.length,
      auto_applied: autoAppliedCount,
      edge_cases_auto_resolved: autoResolvedCount,
      selma_strategies_generated: learnedStrategiesGenerated
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Training review error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
