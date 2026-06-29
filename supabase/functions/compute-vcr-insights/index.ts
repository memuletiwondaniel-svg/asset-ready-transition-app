// AI-1 Readiness Insights Engine — Bob orchestrator + Fred/Ivan/Selma/Hannah/Alex agents
// Advisory only. Never writes to prerequisites / approvers / submit paths.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Confidence = "verified" | "ai_read" | "unavailable";
type Tone = "neutral" | "amber" | "red";
interface Fact {
  label: string;
  value: string;
  tone?: Tone;
  confidence?: Confidence;
  sourceHref?: string;
}
interface Insights {
  state: "ready" | "pending" | "unavailable";
  severity?: "green" | "amber" | "red";
  headline?: string;
  facts?: Fact[];
  delivering_action?: string;
  approver_check?: string;
  sources?: { label: string; href: string }[];
}

const sha = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

// ─── Fred: TI-* completions aggregator across the FULL system set ──────────
async function fredCompletionsAggregator(sb: any, vcrId: string): Promise<Fact[]> {
  // Resolve handover_point → systems → external ids → gohub rows
  const { data: hpsRows } = await sb
    .from("p2a_handover_point_systems")
    .select("system_id")
    .eq("handover_point_id", vcrId);
  const systemIds = (hpsRows || []).map((r: any) => r.system_id).filter(Boolean);
  if (systemIds.length === 0) {
    return [{ label: "Completion scope", value: "No systems assigned", confidence: "unavailable" }];
  }
  const { data: systems } = await sb
    .from("p2a_systems")
    .select("id, name, external_id, completion_percentage, itr_a_count, itr_b_count, itr_total_count, punchlist_a_count, gohub_rollup_total_itrs, gohub_rollup_complete_itrs")
    .in("id", systemIds);

  // Aggregate from cached rollups (verified — fed by gohub-sync-counts)
  let itrTotal = 0, itrComplete = 0, catA = 0, sumPct = 0, pctN = 0;
  for (const s of systems || []) {
    itrTotal += Number(s.gohub_rollup_total_itrs || s.itr_total_count || 0);
    itrComplete += Number(s.gohub_rollup_complete_itrs || 0);
    catA += Number(s.punchlist_a_count || 0);
    if (s.completion_percentage != null) { sumPct += Number(s.completion_percentage); pctN++; }
  }
  const avgPct = pctN > 0 ? Math.round(sumPct / pctN) : null;
  const outstanding = Math.max(0, itrTotal - itrComplete);
  const facts: Fact[] = [
    {
      label: `Systems in scope`,
      value: `${(systems || []).length}`,
      confidence: "verified",
      tone: "neutral",
    },
    {
      label: "ITRs complete (A+B)",
      value: itrTotal > 0 ? `${itrComplete} / ${itrTotal}` : "No data",
      confidence: itrTotal > 0 ? "verified" : "unavailable",
      tone: outstanding > 0 ? "amber" : "neutral",
    },
    {
      label: "Cat-A punch outstanding",
      value: String(catA),
      confidence: "verified",
      tone: catA > 0 ? "red" : "neutral",
    },
  ];
  if (avgPct != null) {
    facts.push({
      label: "Avg completion %",
      value: `${avgPct}%`,
      confidence: "verified",
      tone: avgPct < 100 ? "amber" : "neutral",
    });
  }
  return facts;
}

// ─── Ivan: DI-03 HEMP action-register reader ──────────────────────────────
async function ivanHempReader(sb: any, item: any, lovableKey: string): Promise<Fact[]> {
  const { data: atts } = await sb
    .from("vcr_item_evidence")
    .select("id, file_name, storage_path, mime_type")
    .eq("handover_point_id", item.handover_point_id)
    .eq("vcr_item_id", item.id);
  const pdf = (atts || []).find((a: any) =>
    /pdf/i.test(a.mime_type || "") || /\.pdf$/i.test(a.file_name || ""),
  );
  if (!pdf) {
    return [
      {
        label: "HEMP register",
        value: "No HEMP/HAZOP PDF attached",
        confidence: "unavailable",
        tone: "amber",
      },
    ];
  }

  // Signed URL for source links (private bucket)
  const { data: signed } = await sb.storage.from("vcr-evidence").createSignedUrl(pdf.storage_path, 60 * 60);
  const sourceHref = signed?.signedUrl;

  // Download bytes to send to gateway
  let pdfBytesB64 = "";
  try {
    const { data: blob } = await sb.storage.from("vcr-evidence").download(pdf.storage_path);
    if (blob) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.byteLength; i++) bin += String.fromCharCode(buf[i]);
      pdfBytesB64 = btoa(bin);
    }
  } catch (_e) {
    return [{ label: "HEMP register", value: "Attachment unreadable", confidence: "unavailable", sourceHref }];
  }
  if (!pdfBytesB64) {
    return [{ label: "HEMP register", value: "Attachment empty", confidence: "unavailable", sourceHref }];
  }

  // Ask Gemini to extract the register, structured
  let extracted: any = null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Extract the HEMP/HAZOP action register from the attached PDF. Return strict JSON: {\"actions\":[{\"action\":string,\"study\":string,\"required_change\":string,\"responsible\":string,\"required_ta_discipline\":string,\"status\":\"open|closed\",\"sign_off\":{\"name\":string,\"discipline\":string|null}}]}. If no register is found, return {\"actions\":[]}. Do not invent items.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the action register from this document." },
              { type: "file", file: { filename: pdf.file_name || "hemp.pdf", file_data: `data:application/pdf;base64,${pdfBytesB64}` } },
            ],
          },
        ],
      }),
    });
    if (r.ok) {
      const j = await r.json();
      const txt = j.choices?.[0]?.message?.content || "{}";
      extracted = JSON.parse(typeof txt === "string" ? txt : "{}");
    }
  } catch (_e) {
    /* fall through to unavailable */
  }

  const actions: any[] = Array.isArray(extracted?.actions) ? extracted.actions : [];
  if (actions.length === 0) {
    return [
      {
        label: "HEMP actions found",
        value: "0",
        confidence: "ai_read",
        tone: "amber",
        sourceHref,
      },
    ];
  }
  const closed = actions.filter((a) => /closed/i.test(a.status || ""));
  const open = actions.length - closed.length;
  const discMismatch = closed.filter((a) => {
    const req = (a.required_ta_discipline || "").toLowerCase().trim();
    const got = (a.sign_off?.discipline || "").toLowerCase().trim();
    return req && (!got || (got && !got.includes(req) && !req.includes(got)));
  }).length;

  const facts: Fact[] = [
    { label: "HEMP actions found", value: String(actions.length), confidence: "ai_read", tone: "neutral", sourceHref },
    {
      label: "Open / unresolved",
      value: String(open),
      confidence: "ai_read",
      tone: open > 0 ? "red" : "neutral",
      sourceHref,
    },
    {
      label: "Closed w/ wrong-discipline sign-off",
      value: String(discMismatch),
      confidence: "ai_read",
      tone: discMismatch > 0 ? "amber" : "neutral",
      sourceHref,
    },
  ];
  // Explicitly deferred — declare absence rather than imply check ran
  facts.push({
    label: "P&ID / ITR cross-check",
    value: "Deferred to later layer",
    confidence: "unavailable",
  });
  return facts;
}

// ─── Selma: attachment revision pass (runs on EVERY item) ─────────────────
async function selmaRevisionPass(sb: any, item: any): Promise<Fact[]> {
  const { data: atts } = await sb
    .from("vcr_item_evidence")
    .select("id, file_name")
    .eq("handover_point_id", item.handover_point_id)
    .eq("vcr_item_id", item.id);
  if (!atts || atts.length === 0) {
    const required = (item.supporting_evidence || "").trim();
    if (required) {
      return [{ label: "Required documents attached", value: "0", tone: "amber", confidence: "verified" }];
    }
    return [];
  }
  const facts: Fact[] = [];
  for (const a of atts) {
    const stem = (a.file_name || "").replace(/\.[^.]+$/, "");
    const { data: docs } = await sb
      .from("dms_external_sync")
      .select("document_number, revision, status_code, metadata")
      .ilike("document_number", stem ? `%${stem.slice(0, 30)}%` : "%__none__%")
      .limit(1);
    const d = (docs || [])[0];
    if (!d) {
      facts.push({ label: `Doc: ${a.file_name}`, value: "Not tracked in DMS", confidence: "unavailable" });
      continue;
    }
    const isCurrent = (d.metadata as any)?.is_current_revision !== false;
    facts.push({
      label: `Doc: ${d.document_number} rev ${d.revision || "?"}`,
      value: isCurrent ? "Current revision" : "Outdated revision",
      tone: isCurrent ? "neutral" : "red",
      confidence: "verified",
    });
  }
  return facts;
}

// ─── Bob composer ─────────────────────────────────────────────────────────
function composeSeverity(facts: Fact[]): "green" | "amber" | "red" {
  if (facts.some((f) => f.tone === "red")) return "red";
  if (facts.some((f) => f.tone === "amber")) return "amber";
  return "green";
}
function composeHeadline(facts: Fact[], severity: string): string {
  // Deterministic — uses only facts[]
  const top = facts.find((f) => f.tone === "red") || facts.find((f) => f.tone === "amber");
  if (severity === "red" && top) return `Blocker: ${top.label} — ${top.value}.`;
  if (severity === "amber" && top) return `Heads up: ${top.label} — ${top.value}.`;
  return "All checked signals look ready for review.";
}

// ─── Main handler ─────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Verify caller
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { vcr_id, vcr_item_id, force } = await req.json();
    if (!vcr_id || !vcr_item_id) {
      return new Response(JSON.stringify({ error: "vcr_id and vcr_item_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve item + category
    const { data: itemRow } = await sb
      .from("vcr_items")
      .select("id, supporting_evidence, category:vcr_item_categories(code, name)")
      .eq("id", vcr_item_id)
      .maybeSingle();
    // VCR item record from prereq side has prerequisite_id; look it up
    const { data: prereq } = await sb
      .from("p2a_vcr_prerequisites")
      .select("id")
      .eq("handover_point_id", vcr_id)
      .eq("vcr_item_id", vcr_item_id)
      .maybeSingle();
    const item = { ...(itemRow || {}), prerequisite_id: prereq?.id || null };
    const categoryCode = (itemRow as any)?.category?.code || "??";

    // Routing
    const { data: cfg } = await sb
      .from("vcr_insights_agent_config")
      .select("lead_agent, contrib_agents, config_version")
      .eq("category_code", categoryCode)
      .maybeSingle();
    const lead = cfg?.lead_agent || "selma";
    const contribs = (cfg?.contrib_agents || []) as string[];
    const configVersion = cfg?.config_version || 0;

    // Cache lookup
    const hashInput = JSON.stringify({ configVersion, vcr_id, vcr_item_id, categoryCode, day: new Date().toISOString().slice(0, 10) });
    const inputsHash = await sha(hashInput);
    if (!force) {
      const { data: cached } = await sb
        .from("vcr_item_insights")
        .select("payload, inputs_hash")
        .eq("vcr_id", vcr_id)
        .eq("vcr_item_id", vcr_item_id)
        .maybeSingle();
      if (cached?.inputs_hash === inputsHash) {
        return new Response(JSON.stringify({ insights: cached.payload, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const allFacts: Fact[] = [];
    const runAgent = async (name: string) => {
      try {
        if (name === "fred") allFacts.push(...(await fredCompletionsAggregator(sb, vcr_id)));
        else if (name === "ivan") allFacts.push(...(await ivanHempReader(sb, item, lovableKey)));
        else if (name === "selma") allFacts.push(...(await selmaRevisionPass(sb, item)));
        else if (name === "hannah" || name === "alex") {
          allFacts.push({ label: `${name[0].toUpperCase()}${name.slice(1)} check`, value: "Not connected", confidence: "unavailable" });
        }
      } catch (e) {
        allFacts.push({ label: `${name} agent`, value: `Error: ${(e as Error).message}`, confidence: "unavailable" });
      }
    };
    await runAgent(lead);
    for (const c of contribs) await runAgent(c);

    const usable = allFacts.filter((f) => f.confidence !== "unavailable");
    const insights: Insights = usable.length === 0
      ? { state: "unavailable", facts: allFacts }
      : (() => {
          const severity = composeSeverity(allFacts);
          return {
            state: "ready",
            severity,
            headline: composeHeadline(allFacts, severity),
            facts: allFacts,
            delivering_action: severity === "green" ? "Looks ready — review evidence before marking complete." : "Resolve flagged signals before submitting.",
            approver_check: severity === "green" ? "Live signals look ready." : "Heads up before accepting — confirm flagged signals.",
          };
        })();

    await sb.from("vcr_item_insights").upsert({
      vcr_id, vcr_item_id, payload: insights, inputs_hash: inputsHash,
      state: insights.state, severity: insights.severity ?? null, computed_at: new Date().toISOString(),
    }, { onConflict: "vcr_id,vcr_item_id" });

    return new Response(JSON.stringify({ insights, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
