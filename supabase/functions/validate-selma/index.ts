import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────
interface TestResult {
  id: string;
  name: string;
  tier: number;
  status: "pass" | "fail" | "manual" | "error" | "skipped";
  duration_ms: number;
  details: string;
  response_preview: string;
  go_live_gate: boolean;
}

interface TestDef {
  id: string;
  name: string;
  tier: number;
  query: string;
  agent: "bob" | "selma" | "tool" | "sql";
  autoAssert?: (response: string, meta: StreamMeta) => { pass: boolean; details: string };
  manual?: boolean;
  go_live_gate?: boolean;
  timeout_ms?: number;
}

interface StreamMeta {
  statusEvents: string[];
  hasError: boolean;
  httpStatus: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendChatAndParse(
  query: string,
  token: string,
  timeoutMs = 120000
): Promise<{ content: string; meta: StreamMeta }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: query,
        agentName: "bob",
        conversationId: null,
        conversationHistory: [],
      }),
      signal: controller.signal,
    });

    const meta: StreamMeta = {
      statusEvents: [],
      hasError: resp.status >= 400,
      httpStatus: resp.status,
    };

    if (!resp.ok || !resp.body) {
      const errText = await resp.text().catch(() => "");
      return { content: errText, meta };
    }

    // Parse SSE stream
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nlIdx: number;
      while ((nlIdx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nlIdx);
        buffer = buffer.slice(nlIdx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);

        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
          continue;
        }

        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();

          if (currentEvent === "status") {
            meta.statusEvents.push(data);
          } else if (currentEvent === "message" || currentEvent === "") {
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) content += parsed.content;
              if (parsed.text) content += parsed.text;
              // Handle direct string messages
              if (typeof parsed === "string") content += parsed;
            } catch {
              // Non-JSON data line — might be raw content
              if (data !== "[DONE]") content += data;
            }
          }
          currentEvent = "";
        }

        if (line.startsWith(":") || line.trim() === "") {
          continue; // heartbeat or blank
        }
      }
    }

    return { content: content.trim(), meta };
  } finally {
    clearTimeout(timer);
  }
}

function extractNumber(text: string): number | null {
  // Look for patterns like "255 documents", "total of 200", "found 212"
  const patterns = [
    /(\d{2,})\s*(?:documents?|results?|records?|items?)/i,
    /(?:total|found|count|have|has)\s*(?:of\s+)?(\d{2,})/i,
    /(\d{3,})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function excludesAll(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.every((k) => !lower.includes(k.toLowerCase()));
}

// ─── Test Definitions ───────────────────────────────────────────────
const ALL_TESTS: TestDef[] = [
  // Tier 0 — Bob Regression
  {
    id: "T0.1",
    name: "Bob responds to task query",
    tier: 0,
    query: "What tasks do I have this week?",
    agent: "bob",
    manual: true,
    go_live_gate: true,
  },
  {
    id: "T0.2",
    name: "Bob correctly describes Selma",
    tier: 0,
    query: "Who is Selma?",
    agent: "bob",
    manual: true,
    go_live_gate: true,
  },
  {
    id: "T0.3",
    name: "Bob identity intact after rebuild",
    tier: 0,
    query: "Who are you?",
    agent: "bob",
    autoAssert: (r) => {
      const hasBob = containsAny(r, ["bob"]);
      const claimsSelma = containsAny(r, ["i am selma", "i'm selma", "my name is selma"]);
      return {
        pass: hasBob && !claimsSelma,
        details: claimsSelma
          ? "Bob introduced himself as Selma — system prompt overwritten"
          : hasBob
            ? "Bob identity intact"
            : "Bob did not identify himself — generic AI response",
      };
    },
  },

  // Tier 1 — Smoke Test
  {
    id: "T1.1",
    name: "Basic document query returns response",
    tier: 1,
    query: "Find me a document",
    agent: "bob",
    autoAssert: (r, m) => ({
      pass: !m.hasError && r.length > 10,
      details: m.hasError
        ? `HTTP ${m.httpStatus}`
        : r.length <= 10
          ? "Response too short"
          : "Response received",
    }),
  },

  // Tier 2 — Core Agent
  {
    id: "T2.1",
    name: "Selma identity — warm introduction",
    tier: 2,
    query: "Who are you?",
    agent: "bob",
    go_live_gate: true,
    autoAssert: (r) => {
      const hasSelma = containsAny(r, ["selma", "document"]);
      const leaksTools = containsAny(r, [
        "resolve_document_type",
        "search_assai_documents",
        "executeSelmaTool",
        "resolve_project_code",
      ]);
      return {
        pass: hasSelma && !leaksTools,
        details: !hasSelma
          ? "Missing Selma/document identity"
          : leaksTools
            ? "Tool names leaked in response"
            : "Clean identity response",
      };
    },
  },
  {
    id: "T2.2",
    name: "PEFS acronym resolution (anti-hallucination)",
    tier: 2,
    query: "What is a PEFS?",
    agent: "bob",
    autoAssert: (r) => {
      const hasDbValue = containsAny(r, ["C01", "Process Engineering Flow Sheets", "Process Engineering Flow Scheme"]);
      const hasGeneric = containsAny(r, ["I'm not sure", "I don't know"]);
      return {
        pass: hasDbValue,
        details: hasDbValue
          ? "Resolved PEFS via tool — DB values present (C01 / Process Engineering Flow Sheets)"
          : hasGeneric
            ? "Selma did not call tool — vague/unknown response (hallucination avoided but tool not used)"
            : "Did not resolve PEFS correctly — possible hallucination from training data",
      };
    },
  },
  {
    id: "T2.3a",
    name: "DP normalisation — DP223",
    tier: 2,
    query: "Tell me about DP223",
    agent: "bob",
    autoAssert: (r, m) => ({
      pass: !m.hasError && r.length > 20,
      details: m.hasError ? `HTTP ${m.httpStatus}` : "Responded to DP223",
    }),
  },
  {
    id: "T2.3b",
    name: "DP normalisation — dp 223",
    tier: 2,
    query: "Tell me about dp 223",
    agent: "bob",
    autoAssert: (r, m) => ({
      pass: !m.hasError && r.length > 20,
      details: m.hasError ? `HTTP ${m.httpStatus}` : "Responded to dp 223",
    }),
  },
  {
    id: "T2.3c",
    name: "DP normalisation — DP-223",
    tier: 2,
    query: "Tell me about DP-223",
    agent: "bob",
    autoAssert: (r, m) => ({
      pass: !m.hasError && r.length > 20,
      details: m.hasError ? `HTTP ${m.httpStatus}` : "Responded to DP-223",
    }),
  },
  {
    id: "T2.4",
    name: "Search renders clean markdown (no raw JSON)",
    tier: 2,
    query: "Search for documents on DP223",
    agent: "bob",
    go_live_gate: true,
    autoAssert: (r) => {
      const hasRawJson = containsAny(r, [
        "<structured_response>",
        '"type":"document_search"',
        '"type": "document_search"',
      ]);
      return {
        pass: !hasRawJson && r.length > 50,
        details: hasRawJson
          ? "Raw JSON/structured_response leaked into UI"
          : "Clean response rendered",
      };
    },
  },
  {
    id: "T2.5",
    name: "Vendor discovery uses correct tool",
    tier: 2,
    query: "Who are the main vendors on DP223?",
    agent: "bob",
    autoAssert: (r, m) => ({
      pass: !m.hasError && r.length > 30,
      details: "Response received — LOG CHECK: verify [Selma] Tool: discover_project_vendors in edge function logs (https://supabase.com/dashboard/project/kgnrjqjbonuvpxxfvfjq/functions/ai-chat/logs). If [Selma] Tool: search_assai_documents appears instead → FAIL.",
    }),
  },
  {
    id: "T2.6",
    name: "Ambiguous query triggers clarification",
    tier: 2,
    query: "Show me the engineering documents",
    agent: "bob",
    manual: true,
  },
  {
    id: "T2.7",
    name: "SSE streaming — progressive status updates",
    tier: 2,
    query: "Find all documents for DP164",
    agent: "bob",
    timeout_ms: 120000,
    autoAssert: (r, m) => ({
      pass: m.statusEvents.length >= 2,
      details:
        m.statusEvents.length >= 2
          ? `${m.statusEvents.length} status events received: ${m.statusEvents.slice(0, 3).join(", ")}...`
          : `Only ${m.statusEvents.length} status events — emitStatus may not be wired`,
    }),
  },

  // Tier 3 — Pagination & Session
  {
    id: "T3.1",
    name: "DP164 document count >= 200 (255 not 128)",
    tier: 3,
    query: "How many documents does DP164 have?",
    agent: "bob",
    go_live_gate: true,
    timeout_ms: 120000,
    autoAssert: (r) => {
      const count = extractNumber(r);
      const logNote = " — LOG CHECK: search edge function logs for totalQueryCount — should exceed 12 for full DP164 sweep confirming SessionManager refresh. If totalQueryCount stays below 12, the 12-query refresh threshold is not working.";
      if (count === null) return { pass: false, details: "Could not extract a numeric count from response" + logNote };
      if (count >= 200) return { pass: true, details: `Count: ${count} — pagination working` };
      if (count === 128) return { pass: false, details: `Count: 128 — session exhaustion (SessionManager not refreshing at 12-query threshold)` + logNote };
      if (count === 100) return { pass: false, details: `Count: 100 — pagination not running (stopping after first page)` + logNote };
      return { pass: false, details: `Count: ${count} — below 200 threshold` + logNote };
    },
  },
  {
    id: "T3.2",
    name: "AFC documents for DP164 — complete results",
    tier: 3,
    query: "List all AFC documents for DP164",
    agent: "bob",
    timeout_ms: 120000,
    autoAssert: (r, m) => ({
      pass: !m.hasError && r.length > 100 && !containsAny(r, ["session error", "session expired"]),
      details: containsAny(r, ["session error", "session expired"])
        ? "Mid-search session error detected"
        : "AFC search completed",
    }),
  },
  {
    id: "T3.3",
    name: "P&ID search across projects",
    tier: 3,
    query: "Find all P&ID documents",
    agent: "bob",
    timeout_ms: 120000,
    autoAssert: (r, m) => ({
      pass: !m.hasError && r.length > 50,
      details: m.hasError ? `HTTP ${m.httpStatus}` : "P&ID search completed",
    }),
  },
  {
    id: "T3.4",
    name: "Discipline breakdown for DP164",
    tier: 3,
    query: "Give me a breakdown of documents by discipline for DP164",
    agent: "bob",
    timeout_ms: 120000,
    autoAssert: (r) => ({
      pass: containsAny(r, ["discipline", "mechanical", "electrical", "instrument", "piping", "process"]),
      details: containsAny(r, ["discipline"])
        ? "Discipline breakdown present"
        : "No discipline data found in response",
    }),
  },

  // Tier 4 — Document Reading
  {
    id: "T4.1",
    name: "Read and summarise a real document",
    tier: 4,
    query: "Search for documents on DP223 and then read the first result and summarise it",
    agent: "bob",
    go_live_gate: true,
    timeout_ms: 120000,
    autoAssert: (r) => ({
      pass: r.length > 200,
      details:
        r.length > 200
          ? `Response length: ${r.length} chars — real content returned`
          : `Response only ${r.length} chars — may be metadata-only`,
    }),
  },
  {
    id: "T4.2",
    name: "Read with tag extraction focus",
    tier: 4,
    query: "Search for an engineering document on DP223 and read it. Extract the tag list.",
    agent: "bob",
    timeout_ms: 120000,
    manual: true,
  },
  {
    id: "T4.3",
    name: "Read vendor/ZV-discipline document",
    tier: 4,
    query: "Find a vendor document on DP223 and read its content",
    agent: "bob",
    timeout_ms: 120000,
    autoAssert: (r) => ({
      pass: !containsAny(r, ["SUP_DOC error", "module not found", "cannot read"]) && r.length > 100,
      details: containsAny(r, ["SUP_DOC"])
        ? "SUP_DOC module error detected"
        : "Vendor document read completed",
    }),
  },

  // Tier 5 — Learning
  {
    id: "T5.1a",
    name: "Teach FCD acronym",
    tier: 5,
    query: "FCD means Flow Control Diagram",
    agent: "bob",
    autoAssert: (r) => ({
      pass: containsAny(r, ["learned", "saved", "noted", "remember", "recorded", "got it", "understood"]),
      details: containsAny(r, ["learned", "saved", "noted", "remember", "recorded"])
        ? "Acronym learning confirmed"
        : "No clear confirmation of learning",
    }),
  },
  {
    id: "T5.1b",
    name: "Recall FCD without re-asking",
    tier: 5,
    query: "Show me the FCD for DP223",
    agent: "bob",
    autoAssert: (r) => ({
      pass: !containsAny(r, ["what is FCD", "what does FCD", "what do you mean by FCD"]),
      details: containsAny(r, ["what is FCD", "what does FCD"])
        ? "Selma asked what FCD means — learning recall failed"
        : "FCD resolved without re-asking",
    }),
  },
  {
    id: "T5.2",
    name: "SQL verification — FCD row exists in DB",
    tier: 5,
    query: "",
    agent: "sql",
    autoAssert: () => ({ pass: false, details: "" }), // Overridden in runner
  },

  // Tier 6 — Negative / Edge Cases
  {
    id: "T6.1",
    name: "Fake document — no hallucination",
    tier: 6,
    query: "Find document ZZZZZ-FAKE-999",
    agent: "bob",
    go_live_gate: true,
    autoAssert: (r) => {
      const honestNoResult = containsAny(r, [
        "no results",
        "no documents",
        "not found",
        "couldn't find",
        "could not find",
        "unable to find",
        "no matching",
        "zero results",
        "didn't find",
      ]);
      return {
        pass: honestNoResult,
        details: honestNoResult
          ? "Honest zero-results response"
          : "Possible hallucination — response did not clearly state no results found",
      };
    },
  },
  {
    id: "T6.2",
    name: "Duplicate query — both get responses",
    tier: 6,
    query: "What is a BFD?",
    agent: "bob",
    autoAssert: (r) => ({
      pass: r.length > 20,
      details: r.length > 20 ? "Second query responded" : "Second query may have been cached/blocked",
    }),
  },
  {
    id: "T6.3a",
    name: "Ghost system — Wrench DMS",
    tier: 6,
    query: "Connect me to Wrench DMS",
    agent: "bob",
    autoAssert: (r) => ({
      pass: excludesAll(r, ["Wrench"]) || containsAny(r, ["only", "Assai", "not supported", "don't"]),
      details: containsAny(r, ["Wrench"])
        ? "Response mentions Wrench — ghost system leak"
        : "No Wrench reference",
    }),
  },
  {
    id: "T6.3b",
    name: "Ghost system — Documentum",
    tier: 6,
    query: "Search Documentum for the latest engineering drawings",
    agent: "bob",
    autoAssert: (r) => ({
      pass: excludesAll(r, ["Documentum"]) || containsAny(r, ["only", "Assai", "not supported"]),
      details: containsAny(r, ["Documentum"])
        ? "Response mentions Documentum — ghost system leak"
        : "No Documentum reference",
    }),
  },
  {
    id: "T6.3c",
    name: "Ghost system — SharePoint",
    tier: 6,
    query: "Check SharePoint for the latest project documents",
    agent: "bob",
    autoAssert: (r) => ({
      pass: excludesAll(r, ["SharePoint"]) || containsAny(r, ["only", "Assai", "not supported"]),
      details: containsAny(r, ["SharePoint"])
        ? "Response mentions SharePoint — ghost system leak"
        : "No SharePoint reference",
    }),
  },
  {
    id: "T6.3d",
    name: "Ghost table — dms_external_sync",
    tier: 6,
    query: "Search dms_external_sync for the latest documents",
    agent: "bob",
    autoAssert: (r) => ({
      pass: excludesAll(r, ["dms_external_sync"]) || containsAny(r, ["don't", "cannot", "not", "Assai"]),
      details: containsAny(r, ["dms_external_sync"])
        ? "Response references dms_external_sync as queryable — removal incomplete"
        : "No dms_external_sync reference — removal confirmed",
    }),
  },
  {
    id: "T6.4",
    name: "Read-only enforcement",
    tier: 6,
    query: "Delete all documents in DP223",
    agent: "bob",
    autoAssert: (r) => ({
      pass: containsAny(r, ["read-only", "read only", "cannot delete", "can't delete", "don't have", "not able", "unable"]),
      details: containsAny(r, ["read-only", "read only", "cannot delete", "can't delete"])
        ? "Read-only limit correctly stated"
        : "No clear read-only statement in response",
    }),
  },
];

// ─── Test Runner ────────────────────────────────────────────────────
async function runTest(test: TestDef, token: string): Promise<TestResult> {
  const start = Date.now();
  const timeout = test.timeout_ms ?? 60000;

  try {
    // SQL-type test (T5.2)
    if (test.agent === "sql") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabase
        .from("dms_document_type_acronyms")
        .select("acronym, full_name, type_code, notes, is_learned")
        .eq("acronym", "FCD")
        .maybeSingle();

      const duration = Date.now() - start;

      if (error) {
        return {
          id: test.id, name: test.name, tier: test.tier, status: "error",
          duration_ms: duration, details: `SQL error: ${error.message}`,
          response_preview: JSON.stringify(error), go_live_gate: !!test.go_live_gate,
        };
      }

      if (!data) {
        return {
          id: test.id, name: test.name, tier: test.tier, status: "fail",
          duration_ms: duration, details: "No FCD row found — upsert failed silently",
          response_preview: "null", go_live_gate: !!test.go_live_gate,
        };
      }

      const pass = !!data.type_code && data.is_learned === true;
      return {
        id: test.id, name: test.name, tier: test.tier,
        status: pass ? "pass" : "fail",
        duration_ms: duration,
        details: pass
          ? `FCD row verified: type_code=${data.type_code}, is_learned=true`
          : `Row exists but: type_code=${data.type_code ?? "NULL"}, is_learned=${data.is_learned}`,
        response_preview: JSON.stringify(data, null, 2),
        go_live_gate: !!test.go_live_gate,
      };
    }

    // Chat-based tests
    const { content, meta } = await sendChatAndParse(test.query, token, timeout);
    const duration = Date.now() - start;

    if (meta.hasError) {
      return {
        id: test.id, name: test.name, tier: test.tier, status: "error",
        duration_ms: duration, details: `HTTP ${meta.httpStatus}`,
        response_preview: content.slice(0, 500),
        go_live_gate: !!test.go_live_gate,
      };
    }

    if (test.manual) {
      return {
        id: test.id, name: test.name, tier: test.tier, status: "manual",
        duration_ms: duration, details: "Manual review required",
        response_preview: content.slice(0, 2000),
        go_live_gate: !!test.go_live_gate,
      };
    }

    if (test.autoAssert) {
      const result = test.autoAssert(content, meta);
      return {
        id: test.id, name: test.name, tier: test.tier,
        status: result.pass ? "pass" : "fail",
        duration_ms: duration, details: result.details,
        response_preview: content.slice(0, 2000),
        go_live_gate: !!test.go_live_gate,
      };
    }

    return {
      id: test.id, name: test.name, tier: test.tier, status: "pass",
      duration_ms: duration, details: "Completed",
      response_preview: content.slice(0, 2000),
      go_live_gate: !!test.go_live_gate,
    };
  } catch (err) {
    return {
      id: test.id, name: test.name, tier: test.tier, status: "error",
      duration_ms: Date.now() - start,
      details: err instanceof Error
        ? (err.name === "AbortError" ? `Timeout after ${timeout}ms` : err.message)
        : "Unknown error",
      response_preview: "",
      go_live_gate: !!test.go_live_gate,
    };
  }
}

// ─── HTTP Handler ───────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tier, token } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authorization token required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter tests by tier
    const testsToRun =
      tier === "all" || tier === undefined
        ? ALL_TESTS
        : ALL_TESTS.filter((t) => t.tier === tier);

    if (testsToRun.length === 0) {
      return new Response(
        JSON.stringify({ error: `No tests found for tier ${tier}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Run tests sequentially (they share state for T5.1a → T5.1b → T5.2)
    const results: TestResult[] = [];
    for (const test of testsToRun) {
      console.log(`[validate-selma] Running ${test.id}: ${test.name}`);
      const result = await runTest(test, token);
      console.log(`[validate-selma] ${test.id} → ${result.status} (${result.duration_ms}ms)`);
      results.push(result);
    }

    const summary = {
      total: results.length,
      pass: results.filter((r) => r.status === "pass").length,
      fail: results.filter((r) => r.status === "fail").length,
      manual: results.filter((r) => r.status === "manual").length,
      error: results.filter((r) => r.status === "error").length,
      total_duration_ms: results.reduce((s, r) => s + r.duration_ms, 0),
      go_live_ready: results
        .filter((r) => r.go_live_gate)
        .every((r) => r.status === "pass" || r.status === "manual"),
    };

    return new Response(
      JSON.stringify({ tier: tier ?? "all", summary, tests: results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[validate-selma] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
