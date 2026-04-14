import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey);
}

function getLevelStatus(progress: number): string {
  if (progress >= 85) return "expert";
  if (progress >= 70) return "proficient";
  if (progress >= 50) return "developing";
  if (progress >= 25) return "foundational";
  return "not_started";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_code, trigger_type, target_competency_id, mode } = await req.json();

    if (!agent_code) {
      return new Response(JSON.stringify({ error: "agent_code is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    console.log(`🎯 Assess competencies: agent=${agent_code}, trigger=${trigger_type}, mode=${mode || "incremental"}`);

    // Load completed training sessions
    const { data: sessions, error: sessionsErr } = await supabaseAdmin
      .from("agent_training_sessions")
      .select("id, key_learnings, extracted_tags, knowledge_card, document_name, document_type, document_domain, completed_at")
      .eq("agent_code", agent_code)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    if (sessionsErr) throw sessionsErr;

    if (!sessions || sessions.length === 0) {
      console.log("No completed sessions found — skipping assessment");
      return new Response(JSON.stringify({ success: true, message: "No completed sessions to assess from", updated: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load competency areas
    let competencyQuery = supabaseAdmin
      .from("agent_competency_areas")
      .select("*")
      .eq("agent_code", agent_code);

    if (target_competency_id) {
      competencyQuery = competencyQuery.eq("id", target_competency_id);
    }

    const { data: competencies, error: compErr } = await competencyQuery;
    if (compErr) throw compErr;

    if (!competencies || competencies.length === 0) {
      console.log("No competency areas found — nothing to assess");
      return new Response(JSON.stringify({ success: true, message: "No competency areas to assess", updated: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build session knowledge summary for Claude
    const sessionSummaries = sessions.map((s: any) => {
      const tags = (s.extracted_tags || []).join(", ");
      const kc = s.knowledge_card || {};
      const facts = Array.isArray(kc.facts) ? kc.facts.slice(0, 10).join("; ") : "";
      const procedures = Array.isArray(kc.procedures) ? kc.procedures.slice(0, 5).join("; ") : "";
      return `Session: ${s.document_name || "Untitled"} (${s.document_type || "unknown type"}, ${s.document_domain || "unknown domain"})
Key learnings: ${s.key_learnings || "None recorded"}
Tags: ${tags || "None"}
Facts: ${facts || "None"}
Procedures: ${procedures || "None"}`;
    }).join("\n\n");

    const competencyList = competencies.map((c: any) =>
      `- ID: ${c.id} | Name: "${c.name}" | Description: "${c.description || "No description"}" | Current progress: ${c.progress}%`
    ).join("\n");

    // Call Claude for assessment
    const prompt = `You are an AI competency assessor for an AI agent named "${agent_code}".

Given the training sessions this agent has completed and the competency areas being tracked, assess each competency area on a 0-100 scale.

TRAINING SESSIONS COMPLETED:
${sessionSummaries}

COMPETENCY AREAS TO ASSESS:
${competencyList}

SCORING GUIDE:
- 0-24: Not Started — no relevant training material covers this area
- 25-49: Foundational — basic concepts touched on but not deeply explored
- 50-69: Developing — moderate coverage with some practical knowledge
- 70-84: Proficient — strong coverage with detailed understanding demonstrated
- 85-100: Expert — comprehensive, deep knowledge with practical procedures

For each competency, consider:
1. How many training sessions cover topics relevant to this competency?
2. How deeply do the key learnings relate to the competency's name and description?
3. Are there specific facts, procedures, or domain knowledge that directly apply?

Return a JSON array of assessments. Each assessment must have:
- competency_id: the ID from the list above
- progress: number 0-100
- notes: brief explanation (1-2 sentences) of why this score was assigned
- relevant_session_ids: array of session IDs whose content contributed to this score

Respond with ONLY valid JSON in this format:
{ "assessments": [ { "competency_id": "...", "progress": 65, "notes": "...", "relevant_session_ids": ["..."] } ] }`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errText);
      throw new Error(`Anthropic API error: ${anthropicResponse.status}`);
    }

    const anthropicData = await anthropicResponse.json();
    const responseText = anthropicData.content?.[0]?.text || "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse assessment JSON from response:", responseText.substring(0, 500));
      throw new Error("Failed to parse assessment response");
    }

    const assessmentResult = JSON.parse(jsonMatch[0]);
    const assessments = assessmentResult.assessments || [];

    console.log(`📊 Received ${assessments.length} assessments`);

    const now = new Date().toISOString();
    const updated: Array<{ competency_id: string; previous_progress: number; new_progress: number; name: string }> = [];

    // Apply each assessment
    for (const assessment of assessments) {
      const competency = competencies.find((c: any) => c.id === assessment.competency_id);
      if (!competency) {
        console.warn(`Competency ${assessment.competency_id} not found — skipping`);
        continue;
      }

      const newProgress = Math.max(0, Math.min(100, Math.round(assessment.progress)));
      const newStatus = getLevelStatus(newProgress);
      const rawSessionIds = assessment.relevant_session_ids || [];
      
      // Filter to valid UUIDs only (Claude sometimes returns session names instead)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validSessionIds = rawSessionIds.filter((id: string) => uuidRegex.test(id));

      // Merge linked_session_ids
      const existingIds = competency.linked_session_ids || [];
      const mergedIds = [...new Set([...existingIds, ...validSessionIds])];

      // Update competency area
      const { error: updateErr } = await supabaseAdmin
        .from("agent_competency_areas")
        .update({
          progress: newProgress,
          status: newStatus,
          ai_assessment_notes: assessment.notes || null,
          linked_session_ids: mergedIds,
          last_assessed_at: now,
        })
        .eq("id", assessment.competency_id);

      if (updateErr) {
        console.error(`Failed to update competency ${assessment.competency_id}:`, updateErr);
        continue;
      }

      // Insert audit row
      await supabaseAdmin.from("agent_competency_updates").insert({
        competency_id: assessment.competency_id,
        trigger_type: trigger_type || "manual",
        previous_progress: competency.progress,
        new_progress: newProgress,
        assessment_notes: assessment.notes || null,
        session_id: relevantSessionIds[0] || null,
      });

      updated.push({
        competency_id: assessment.competency_id,
        previous_progress: competency.progress,
        new_progress: newProgress,
        name: competency.name,
      });

      console.log(`  ✅ ${competency.name}: ${competency.progress}% → ${newProgress}% (${newStatus})`);
    }

    console.log(`🎯 Assessment complete: ${updated.length}/${assessments.length} competencies updated`);

    return new Response(JSON.stringify({
      success: true,
      updated,
      timestamp: now,
      sessions_analyzed: sessions.length,
      competencies_assessed: assessments.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("assess-agent-competencies error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
