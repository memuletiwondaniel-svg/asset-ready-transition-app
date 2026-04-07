import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const agentDomainPrompts: Record<string, string> = {
  fred: `You are Fred, a specialist in Commissioning Systems and Hardware Readiness.
Your domain expertise covers: Mechanical Completion, Pre-Commissioning, Commissioning,
ITR management (A-ITRs and B-ITRs), punch list control and categorisation (Category A/B),
completion certificates (MCC, RFC/PCC, RFSU, SoF), systemisation and LOSH drawings,
completions management systems, handover dossiers, gated handover processes, walkdown
procedures, red-line markups, and the Construction–Pre-Commissioning–CSU interface.`,

  selma: `You are Selma, a specialist in Document Intelligence and Document Control.
Your domain expertise covers: document management systems, document numbering conventions
and structures, revision control, document type classifications, vendor document management,
transmittals, document handover packages, and document intelligence for oil and gas capital
projects.`,

  bob: `You are Bob, an Operations Readiness CoPilot.
Your domain expertise covers: operations readiness, project handover coordination,
task management, stakeholder communication, and general ORSH platform navigation.`,

  hannah: `You are Hannah, a specialist in Training Records and Competency Assurance.
Your domain expertise covers: training records management, competency assurance,
personnel qualifications, and learning and development for operations readiness.`,

  ivan: `You are Ivan, a Technical Authority specialist.
Your domain expertise covers: technical authority decisions, engineering standards,
design queries, technical queries (TQs), and technical integrity for oil and gas
capital projects.`,

  alex: `You are Alex, a Maintenance System Readiness specialist.
Your domain expertise covers: technical data extraction from engineering drawings,
asset register construction, CMMS data population, and maintenance strategy.`,
};

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey);
}

function buildAnonymizationSection(rules: Array<{ find: string; replace: string }>): string {
  if (!rules || rules.length === 0) return "";
  const ruleLines = rules.map(r => `- Never say "${r.find}" — always say "${r.replace}" instead.`).join("\n");
  return `\nANONYMIZATION RULES — apply these to ALL your responses without exception:
${ruleLines}
Violating these rules is a critical error. They apply permanently for this session.\n`;
}

async function buildExistingKnowledgeSection(supabaseAdmin: any, agentCode: string): Promise<string> {
  const { data: prevSessions } = await supabaseAdmin
    .from("agent_training_sessions")
    .select("document_name, key_learnings")
    .eq("agent_code", agentCode)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  if (!prevSessions || prevSessions.length === 0) return "";

  const entries = prevSessions
    .filter((s: any) => s.key_learnings)
    .map((s: any, i: number) => `${i + 1}. "${s.document_name || "Untitled"}": ${s.key_learnings}`)
    .join("\n");

  if (!entries) return "";

  return `\nEXISTING KNOWLEDGE FROM PREVIOUS TRAINING:
${entries}
If the new document contradicts anything above, flag it using this exact format:
⚠️ CONTRADICTION: This document states [X]. Previously I learned [Y] from [document name]. Please clarify which is correct.\n`;
}

const TRAINING_RESPONSE_FORMAT = `
After reading any document or material, ALWAYS structure your response with these
exact markdown headings in this exact order:

## What I understood
[2–3 sentences summarising what this document is and why it matters to your domain]

## Core facts I extracted
- [factual statement] — confidence: [high / medium / low]
[list every significant fact, rule, requirement, or constraint in the document]

## Procedures I identified
### [Procedure name]
1. [step]
2. [step]
[one subsection per procedure found — skip this heading if no procedures exist]

## Key terminology
- **[TERM]**: [definition in your own words — not copied verbatim from the document]
[domain-specific terms only — skip general terms]

## Decision rules
- IF [condition] → THEN [action] — priority: [critical / high / medium]
[skip this heading if no decision logic exists in the document]

## My confidence level
[High / Medium / Low] — [reason if medium or low]

## My clarifying questions
[List 2–3 specific, targeted questions about genuine ambiguities in the document.
If you have no further questions after this exchange, write exactly:
"No further questions — I believe I have a complete understanding."]`;

function analyzeResponse(responseText: string): {
  completion_suggested: boolean;
  open_questions_count: number;
  contradiction_detected: boolean;
} {
  const completionSuggested = responseText.includes("No further questions — I believe I have a complete understanding");
  const contradictionDetected = responseText.includes("⚠️ CONTRADICTION:");

  let openQuestionsCount = 0;
  const questionsMatch = responseText.match(/## My clarifying questions[\s\S]*$/);
  if (questionsMatch && !completionSuggested) {
    const lines = questionsMatch[0].split("\n");
    openQuestionsCount = lines.filter(l => /^\s*\d+\.\s/.test(l) || /^\s*-\s/.test(l)).length;
  }

  return { completion_suggested: completionSuggested, open_questions_count: openQuestionsCount, contradiction_detected: contradictionDetected };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      session_id,
      agent_code,
      mode = "training",
      messages,
      file_data,
      document_context,
      anonymization_rules = [],
      testing = false,
    } = body;

    if (!agent_code) {
      return new Response(JSON.stringify({ error: "agent_code is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const agentPrompt = agentDomainPrompts[agent_code] || agentDomainPrompts.bob;

    // ─── MODE: COMPLETE ───
    if (mode === "complete") {
      if (!session_id) {
        return new Response(JSON.stringify({ error: "session_id required for complete mode" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: session, error: sessErr } = await supabaseAdmin
        .from("agent_training_sessions")
        .select("*")
        .eq("id", session_id)
        .single();

      if (sessErr || !session) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const transcript = session.transcript || [];

      if (testing) {
        // Test scoring
        const scoringPrompt = `Given the following test conversation and knowledge card, score the agent's performance from 0 to 100. Return ONLY this JSON object, no other text:

{
  "score": integer,
  "questions_asked": integer,
  "correct_count": integer,
  "gaps_identified": ["string"],
  "recommendation": "string"
}

Knowledge card: ${JSON.stringify(session.knowledge_card || {})}
Test conversation: ${JSON.stringify(transcript)}`;

        const scoreResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [{ role: "user", content: scoringPrompt }],
          }),
        });

        const scoreResult = await scoreResponse.json();
        const scoreText = scoreResult.content?.[0]?.text || "{}";
        let testResult;
        try { testResult = JSON.parse(scoreText); } catch { testResult = { score: 0, gaps_identified: [], recommendation: "Could not parse test results" }; }

        const testHistory = [...(session.test_history || []), { ...testResult, tested_at: new Date().toISOString() }];
        await supabaseAdmin
          .from("agent_training_sessions")
          .update({
            last_test_score: testResult.score,
            last_test_at: new Date().toISOString(),
            test_history: testHistory,
          })
          .eq("id", session_id);

        return new Response(JSON.stringify({
          content: `Test completed. Score: ${testResult.score}/100`,
          metadata: { completion_suggested: false, open_questions_count: 0, contradiction_detected: false, session_updated: true },
          test_result: testResult,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Training completion — extract knowledge card
      const extractionPrompt = `Given the following training conversation transcript, extract and return ONLY a valid JSON object. No preamble. No markdown fences. No explanation. Return the JSON object only.

{
  "knowledge_card": {
    "core_facts": [
      { "statement": "string", "confidence": "high|medium|low", "tags": ["string"] }
    ],
    "procedures": [
      { "name": "string", "steps": ["string"], "tags": ["string"] }
    ],
    "entities": [
      { "term": "string", "definition": "string", "related_terms": ["string"] }
    ],
    "decision_rules": [
      { "condition": "string", "action": "string", "priority": "critical|high|medium", "tags": ["string"] }
    ],
    "suggested_test_questions": [
      { "question": "string", "difficulty": "easy|medium|hard", "expected_answer_guidance": "string" }
    ]
  },
  "key_learnings_summary": "2–4 sentences, no company or system names",
  "confidence_level": "high|medium|low",
  "extracted_tags": ["string"]
}

Transcript:
${JSON.stringify(transcript)}`;

      const extractResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content: extractionPrompt }],
        }),
      });

      const extractResult = await extractResponse.json();
      const extractText = extractResult.content?.[0]?.text || "{}";
      let parsed;
      try { parsed = JSON.parse(extractText); } catch {
        parsed = { knowledge_card: {}, key_learnings_summary: "", confidence_level: "low", extracted_tags: [] };
      }

      const createdAt = new Date(session.created_at).getTime();
      const durationSeconds = Math.round((Date.now() - createdAt) / 1000);
      const staleAfter = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from("agent_training_sessions")
        .update({
          knowledge_card: parsed.knowledge_card || {},
          key_learnings: parsed.key_learnings_summary || "",
          confidence_level: parsed.confidence_level || "medium",
          extracted_tags: parsed.extracted_tags || [],
          status: "completed",
          completed_at: new Date().toISOString(),
          stale_after: staleAfter,
          completion_method: "user_confirmed",
          training_duration_seconds: durationSeconds,
        })
        .eq("id", session_id);

      return new Response(JSON.stringify({
        content: "Training session completed. Knowledge card extracted.",
        metadata: { completion_suggested: false, open_questions_count: 0, contradiction_detected: false, session_updated: true },
        knowledge_card: parsed.knowledge_card,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── MODE: TRAINING or TESTING ───
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt: string;

    if (mode === "testing") {
      // Load session knowledge for testing
      let knowledgeSummary = "";
      let docName = "a previously trained document";
      let docType = "";
      let docDomain = "";

      if (session_id) {
        const { data: session } = await supabaseAdmin
          .from("agent_training_sessions")
          .select("knowledge_card, key_learnings, document_name, document_type, document_domain")
          .eq("id", session_id)
          .single();
        if (session) {
          knowledgeSummary = session.key_learnings || "";
          docName = session.document_name || docName;
          docType = session.document_type || "";
          docDomain = session.document_domain || "";
        }
      }

      systemPrompt = `${agentPrompt}
${buildAnonymizationSection(anonymization_rules)}
You are operating in TESTING MODE.
You have previously been trained on: ${docName}${docType ? ` (${docType})` : ""}${docDomain ? `, domain: ${docDomain}` : ""}
Your training summary: ${knowledgeSummary}

A user is testing your understanding of this document. Answer their questions precisely
and specifically based only on what you learned during training. If you are uncertain,
say so explicitly. Apply the same anonymization rules — never use the original company
or system names.`;
    } else {
      // Training mode
      const existingKnowledge = await buildExistingKnowledgeSection(supabaseAdmin, agent_code);

      systemPrompt = `${agentPrompt}

You are operating in TRAINING MODE. A user is training you on a new document.
Your role is to read the material carefully and extract structured knowledge from it.
${buildAnonymizationSection(anonymization_rules)}${existingKnowledge}${TRAINING_RESPONSE_FORMAT}`;
    }

    // Build Claude messages
    const claudeMessages = messages.map((m: any) => {
      const msg: any = { role: m.role, content: m.content || "" };
      return msg;
    });

    // Handle file_data on last user message
    if (file_data && claudeMessages.length > 0) {
      const lastIdx = claudeMessages.length - 1;
      const existing = claudeMessages[lastIdx].content;

      if (typeof file_data === "object" && file_data.base64) {
        // New format: { base64, mime_type, filename }
        const { base64, mime_type, filename } = file_data;
        if (mime_type.startsWith("image/")) {
          const b64Data = base64.includes(",") ? base64.split(",")[1] : base64;
          claudeMessages[lastIdx].content = [
            { type: "image", source: { type: "base64", media_type: mime_type, data: b64Data } },
            { type: "text", text: existing || `Please analyze this document: ${filename || "uploaded file"}` },
          ];
        } else {
          claudeMessages[lastIdx].content = `[Document uploaded: ${filename || "file"}]\n\n${existing || "Please analyze this document."}`;
        }
      } else if (typeof file_data === "string") {
        // Legacy format: data URL string
        if (file_data.startsWith("data:image/")) {
          const mediaType = file_data.split(";")[0].split(":")[1];
          const base64Data = file_data.split(",")[1];
          claudeMessages[lastIdx].content = [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
            { type: "text", text: existing || `Please analyze this document: uploaded file` },
          ];
        } else if (file_data.startsWith("data:")) {
          claudeMessages[lastIdx].content = `[Document uploaded]\n\n${existing || "Please analyze this document."}`;
        }
      }
    }

    const maxTokens = mode === "training" ? 8192 : 4096;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Training chat failed", details: errorText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.content?.[0]?.text || "I could not generate a response. Please try again.";

    // Analyze response for metadata
    const metadata = {
      ...analyzeResponse(content),
      session_updated: false,
    };

    // DB update: save transcript, increment message count
    if (session_id) {
      try {
        const { data: currentSession } = await supabaseAdmin
          .from("agent_training_sessions")
          .select("transcript, message_count, contradiction_flags")
          .eq("id", session_id)
          .single();

        if (currentSession) {
          const lastUserMsg = messages[messages.length - 1];
          const updatedTranscript = [
            ...(currentSession.transcript || []),
            { role: "user", content: lastUserMsg?.content || "", timestamp: new Date().toISOString() },
            { role: "assistant", content, timestamp: new Date().toISOString() },
          ];

          const contradictionFlags = currentSession.contradiction_flags || [];
          if (metadata.contradiction_detected) {
            const contradictionMatch = content.match(/⚠️ CONTRADICTION:([^]*?)(?=\n\n|$)/);
            contradictionFlags.push({
              detected_at: new Date().toISOString(),
              summary: (contradictionMatch?.[1] || "").trim().substring(0, 200),
            });
          }

          await supabaseAdmin
            .from("agent_training_sessions")
            .update({
              transcript: updatedTranscript,
              message_count: (currentSession.message_count || 0) + 2,
              open_questions_count: metadata.open_questions_count,
              contradiction_flags: contradictionFlags,
              updated_at: new Date().toISOString(),
            })
            .eq("id", session_id);

          metadata.session_updated = true;
        }
      } catch (dbErr) {
        console.error("DB update error:", dbErr);
      }
    }

    return new Response(JSON.stringify({ content, metadata }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-training-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
