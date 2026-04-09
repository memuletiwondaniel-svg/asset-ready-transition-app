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

// ─── CHANGE 2b: Self-organizing context injection ───
// Replaces the old buildExistingKnowledgeSection that only loaded 5 same-agent sessions.
// This version loads ALL completed sessions across ALL agents, scores by keyword overlap,
// and injects the most relevant within a token budget.
// TODO: For scale beyond ~100 sessions, consider Postgres full-text search (to_tsvector) pre-filtering.
async function buildKnowledgeContext(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  currentAgentCode: string,
  documentContext: { document_domain?: string; document_name?: string; document_type?: string } | undefined,
  maxTokens: number = 2000
): Promise<string> {
  // Load foundation knowledge (agent_code IS NULL = universal, or matches current agent)
  const { data: foundationKnowledge } = await supabaseAdmin
    .from("agent_foundation_knowledge")
    .select("title, knowledge_card, agent_code, template_type")
    .eq("template_type", "knowledge")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: allSessions } = await supabaseAdmin
    .from("agent_training_sessions")
    .select("id, agent_code, document_name, document_domain, key_learnings, extracted_tags, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(100);

  const currentDomainWords = [
    ...(documentContext?.document_domain ?? "").toLowerCase().split(/\s+/),
    ...(documentContext?.document_name ?? "").toLowerCase().split(/\s+/),
    ...(documentContext?.document_type ?? "").toLowerCase().split(/\s+/),
  ].filter(w => w.length > 3);

  let contextString = "";

  // Inject foundation knowledge FIRST (outside session token budget)
  const relevantFoundation = (foundationKnowledge ?? []).filter(fk =>
    fk.agent_code === null || fk.agent_code === currentAgentCode
  );

  if (relevantFoundation.length > 0) {
    const scoredFoundation = relevantFoundation.map(fk => {
      const fkText = (fk.title + " " + JSON.stringify(fk.knowledge_card?.core_facts?.map((f: any) => f.tags))).toLowerCase();
      const overlapScore = currentDomainWords.length > 0
        ? currentDomainWords.filter(w => fkText.includes(w)).length
        : (fk.agent_code === currentAgentCode ? 1 : 0);
      return { ...fk, overlapScore };
    }).filter(f => f.overlapScore > 0 || f.agent_code === currentAgentCode);

    if (scoredFoundation.length > 0) {
      contextString += `\nFOUNDATION KNOWLEDGE (verified, always applies):\n`;
      for (const fk of scoredFoundation) {
        const summary = (fk.knowledge_card?.core_facts as any[])
          ?.slice(0, 3)
          .map((f: any) => `- ${f.statement}`)
          .join("\n") ?? "";
        contextString += `[${fk.title}]\n${summary}\n\n`;
      }
    }
  }

  if (!allSessions || allSessions.length === 0) return contextString;

  if (currentDomainWords.length === 0) {
    const recent = allSessions
      .filter(s => s.agent_code === currentAgentCode && s.key_learnings)
      .slice(0, 3);
    if (recent.length > 0) {
      const lines = recent.map(s => `- "${s.document_name || "Untitled"}": ${s.key_learnings}`).join("\n");
      contextString += `\nYOUR PREVIOUS TRAINING (most recent):\n${lines}\n`;
    }
    return contextString;
  }

  const scored = allSessions.map(session => {
    const sessionText = [
      session.document_domain ?? "",
      session.document_name ?? "",
      (session.extracted_tags ?? []).join(" "),
    ].join(" ").toLowerCase();
    const overlapScore = currentDomainWords.filter(word => sessionText.includes(word)).length;
    return { ...session, overlapScore };
  }).filter(s => s.overlapScore > 0)
    .sort((a, b) => b.overlapScore - a.overlapScore);

  const sameAgent = scored.filter(s => s.agent_code === currentAgentCode);
  const crossAgent = scored.filter(s => s.agent_code !== currentAgentCode);

  let tokenCount = 0;
  const sameAgentLines: string[] = [];
  for (const session of sameAgent) {
    const line = `- "${session.document_name}" (${session.document_domain}): ${session.key_learnings}`;
    const tokens = Math.ceil(line.length / 4);
    if (tokenCount + tokens > maxTokens * 0.7) break;
    sameAgentLines.push(line);
    tokenCount += tokens;
  }

  const crossAgentLines: string[] = [];
  for (const session of crossAgent.slice(0, 3)) {
    const line = `- ${session.agent_code.toUpperCase()} trained on "${session.document_name}" (${session.document_domain}): ${session.key_learnings}`;
    const tokens = Math.ceil(line.length / 4);
    if (tokenCount + tokens > maxTokens) break;
    crossAgentLines.push(line);
    tokenCount += tokens;
  }

  if (sameAgentLines.length > 0) {
    contextString += `\nYOUR PREVIOUS TRAINING (most relevant to this document):\n`;
    contextString += sameAgentLines.join("\n") + "\n";
    contextString += `\nIf the new document contradicts anything above, flag it:\n`;
    contextString += `⚠️ CONTRADICTION: This document states [X]. Previously I learned [Y] from [document name]. Please clarify.\n`;
  }
  if (crossAgentLines.length > 0) {
    contextString += `\nPEER AGENT KNOWLEDGE (reference only — do not modify or contradict without flagging):\n`;
    contextString += crossAgentLines.join("\n") + "\n";
  }

  return contextString;
}

// ─── CHANGE 2c: Server-side completeness score calculation ───
function calculateCompletenessScore(
  knowledgeCard: any,
  confidenceLevel: string,
  contradictionFlagsCount: number,
  openQuestionsCount: number
): number {
  let score = 0;
  const facts = knowledgeCard?.core_facts || [];
  const procedures = knowledgeCard?.procedures || [];
  const entities = knowledgeCard?.entities || [];
  const rules = knowledgeCard?.decision_rules || [];

  if (facts.length >= 5) score += 20;
  if (facts.some((f: any) => f.confidence === "high")) score += 10;
  if (procedures.some((p: any) => (p.steps || []).length >= 3)) score += 20;
  if (entities.length >= 3) score += 15;
  if (rules.length >= 1) score += 15;
  if (openQuestionsCount === 0) score += 20;

  const contradictionDeduction = Math.min(contradictionFlagsCount * 10, 20);
  score -= contradictionDeduction;
  if (confidenceLevel === "low") score -= 10;

  return Math.max(0, Math.min(100, score));
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

      // ─── CHANGE 2c: Calculate completeness score server-side ───
      const kc = parsed.knowledge_card || {};
      const contradictionCount = (session.contradiction_flags || []).length;
      const openQuestions = session.open_questions_count || 0;
      const completenessScore = calculateCompletenessScore(
        kc,
        parsed.confidence_level || "medium",
        contradictionCount,
        openQuestions
      );

      await supabaseAdmin
        .from("agent_training_sessions")
        .update({
          knowledge_card: kc,
          key_learnings: parsed.key_learnings_summary || "",
          confidence_level: parsed.confidence_level || "medium",
          extracted_tags: parsed.extracted_tags || [],
          completeness_score: completenessScore,
          knowledge_status: "pending_review",
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
        knowledge_card: kc,
        completeness_score: completenessScore,
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
      // Training mode — use self-organizing context + dynamic templates
      const existingKnowledge = await buildKnowledgeContext(supabaseAdmin, agent_code, document_context);

      // Load dynamic lens for this agent + document type
      let lensFragment = "";
      let extractionFragment = "";
      const docType = document_context?.document_type ?? "";

      if (docType) {
        const { data: lensRecord } = await supabaseAdmin
          .from("agent_foundation_knowledge")
          .select("prompt_fragment")
          .eq("template_type", "lens")
          .eq("is_active", true)
          .eq("agent_code", agent_code)
          .eq("document_type", docType)
          .limit(1)
          .maybeSingle();

        if (lensRecord?.prompt_fragment) {
          lensFragment = "\n\n" + lensRecord.prompt_fragment;
        }

        // Load extraction template (agent_code IS NULL = universal)
        const { data: extractionRecords } = await supabaseAdmin
          .from("agent_foundation_knowledge")
          .select("prompt_fragment")
          .eq("template_type", "extraction")
          .eq("is_active", true)
          .eq("document_type", docType)
          .order("sort_order", { ascending: true });

        if (extractionRecords && extractionRecords.length > 0) {
          // Use the most specific match (agent-specific if exists, else universal)
          const record = extractionRecords[0];
          if (record.prompt_fragment) {
            extractionFragment = "\n\n" + record.prompt_fragment;
          }
        }
      }

      const agentPromptWithLens = agentPrompt + lensFragment;
      const responseFormat = TRAINING_RESPONSE_FORMAT + extractionFragment;

      systemPrompt = `${agentPromptWithLens}

You are operating in TRAINING MODE. A user is training you on a new document.
Your role is to read the material carefully and extract structured knowledge from it.
${buildAnonymizationSection(anonymization_rules)}${existingKnowledge}${responseFormat}`;
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

    // ─── CHANGE 2a: Prefilling for training mode ───
    // Append a partial assistant message to force structured response format
    const apiMessages = mode === "training"
      ? [...claudeMessages, { role: "assistant" as const, content: "## What I understood\n" }]
      : claudeMessages;

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
        messages: apiMessages,
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
    let content = result.content?.[0]?.text || "I could not generate a response. Please try again.";

    // For training mode, prepend the prefill since Claude continues from it
    if (mode === "training") {
      content = "## What I understood\n" + content;
    }

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
