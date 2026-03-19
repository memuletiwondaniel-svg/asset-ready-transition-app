import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("🤖 AI Training Review Job starting...");

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
      .select('id, trigger_message, category, severity')
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

    // 4. Generate improvement suggestions using AI (if LOVABLE_API_KEY available)
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
                content: `Analyze these ${negCount} negative feedback items from the last 24h and suggest 3-5 concrete prompt improvements:\n\n${JSON.stringify(feedbackSummary, null, 2)}\n\nReturn JSON: { "suggestions": [{ "area": "...", "current_behavior": "...", "suggested_improvement": "...", "priority": "high|medium|low" }] }`
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
                          priority: { type: "string", enum: ["high", "medium", "low"] }
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

    // 5. Store the training review results
    const feedbackSummary = {
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
      unresolved_edge_cases: unresolvedEdgeCases?.length || 0
    };

    if (suggestions.length > 0) {
      await supabase.from('ai_prompt_improvements').insert({
        agent_code: 'bob-copilot',
        suggested_changes: suggestions,
        feedback_summary: feedbackSummary,
        status: 'pending'
      });
    }

    // 6. Log the training review event
    await supabase.from('ai_training_log').insert({
      event_type: 'daily_training_review',
      agent_code: 'bob-copilot',
      description: `Daily training review: ${posCount} positive, ${negCount} negative feedback. ${suggestions.length} improvements suggested.`,
      metadata: {
        ...feedbackSummary,
        suggestions_count: suggestions.length,
        reviewed_at: new Date().toISOString()
      }
    });

    console.log(`✅ Training review complete: ${posCount}+ ${negCount}- feedback, ${suggestions.length} suggestions`);

    return new Response(JSON.stringify({
      success: true,
      summary: feedbackSummary,
      suggestions_generated: suggestions.length
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
