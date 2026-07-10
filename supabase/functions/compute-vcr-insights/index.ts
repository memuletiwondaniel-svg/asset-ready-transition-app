// AI-1 Readiness Insights Engine — Bob orchestrator + Fred/Ivan/Selma/Hannah/Alex agents
// Advisory only. Never writes to prerequisites / approvers / submit paths.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument } from "npm:pdf-lib@1.17.1";

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
  summary?: string;
  next_step?: string | null;
  facts?: Fact[];
  delivering_action?: string;
  approver_check?: string;
  sources?: { label: string; href: string }[];
  readiness_label?: string;
  terminal?: boolean;
}

const sha = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const DB_TIMEOUT_MS = 2_500;
const STORAGE_TIMEOUT_MS = 15_000;
const AI_TIMEOUT_MS = 25_000;
const MAX_PDF_BYTES = 40 * 1024 * 1024;       // hard download cap (real registers seen at ~32 MB)
const IVAN_INLINE_BYTE_LIMIT = 15 * 1024 * 1024; // > this → must use windowed path
const IVAN_PAGE_BUDGET = 60;                  // total pages Ivan will analyse per pass
const IVAN_WINDOW_PAGES = 20;                 // pages per Gemini call within the budget
const IVAN_WINDOW_OVERLAP = 2;                // overlap so any action straddling one 20-page
                                              // boundary is wholly contained in at least one window
const IVAN_WALL_BUDGET_MS = 60_000;           // hard wall-clock for Ivan's whole pass

function withAbort<T extends { abortSignal?: (signal: AbortSignal) => T }>(query: T, signal: AbortSignal): T {
  return typeof query.abortSignal === "function" ? query.abortSignal(signal) : query;
}

async function bounded<T>(
  label: string,
  ms: number,
  fallback: T,
  run: (signal: AbortSignal) => PromiseLike<T>,
): Promise<T> {
  const controller = new AbortController();
  let settled = false;
  const timeout = new Promise<T>((resolve) => {
    setTimeout(() => {
      if (!settled) {
        controller.abort();
        console.warn(`[compute-vcr-insights] ${label} timed out after ${ms}ms`);
        resolve(fallback);
      }
    }, ms);
  });
  try {
    const work = Promise.resolve(run(controller.signal)).then(
      (value) => {
        settled = true;
        return value;
      },
      (error) => {
        settled = true;
        throw error;
      },
    );
    return await Promise.race([work, timeout]);
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    console.warn(`[compute-vcr-insights] ${label} bounded fallback (${name})`);
    return fallback;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return btoa(chunks.join(""));
}

// ─── Fred: TI-* completions aggregator across the FULL system set ──────────
async function fredCompletionsAggregator(sb: any, vcrId: string): Promise<Fact[]> {
  // Resolve handover_point → systems → external ids → gohub rows
  const { data: hpsRows } = await bounded("fred system scope", DB_TIMEOUT_MS, { data: [] }, (signal) =>
    withAbort(
      sb.from("p2a_handover_point_systems").select("system_id").eq("handover_point_id", vcrId),
      signal,
    ),
  );
  const systemIds = (hpsRows || []).map((r: any) => r.system_id).filter(Boolean);
  if (systemIds.length === 0) {
    return [{ label: "Completion scope", value: "No systems assigned", confidence: "unavailable" }];
  }
  const { data: systems } = await bounded("fred system rollups", DB_TIMEOUT_MS, { data: [] }, (signal) =>
    withAbort(
      sb
        .from("p2a_systems")
        .select("id, name, external_id, completion_percentage, itr_a_count, itr_b_count, itr_total_count, punchlist_a_count, gohub_rollup_total_itrs, gohub_rollup_complete_itrs")
        .in("id", systemIds),
      signal,
    ),
  );

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

// ─── source_rollup: discipline-scoped rollup from gohub_* mirrors ─────────
// Driven by vcr_item_insight_templates.source_rollup jsonb:
//   { source: 'gohub_itr', disciplines: ['E','I'], label_prefix: 'Ex (E+I)' }
interface SourceRollupCfg {
  source?: string;
  disciplines?: string[];
  label_prefix?: string;
}
async function sourceRollupEngine(sb: any, vcrId: string, cfg: SourceRollupCfg): Promise<Fact[]> {
  const disciplines = (cfg.disciplines || []).map((d) => String(d).toUpperCase()).filter(Boolean);
  const prefix = (cfg.label_prefix || "Scoped").trim();
  if (!disciplines.length) return [];
  // Same scope resolution as Fred: handover point → systems.
  // p2a_systems.system_id text column holds the gohub subsystem_number.
  const { data: hpsRows } = await bounded("source_rollup scope", DB_TIMEOUT_MS, { data: [] }, (signal) =>
    withAbort(
      sb.from("p2a_handover_point_systems").select("system_id").eq("handover_point_id", vcrId),
      signal,
    ),
  );
  const sysIds = (hpsRows || []).map((r: any) => r.system_id).filter(Boolean);
  if (sysIds.length === 0) return [];
  const { data: systems } = await bounded("source_rollup systems", DB_TIMEOUT_MS, { data: [] }, (signal) =>
    withAbort(
      sb.from("p2a_systems").select("system_id").in("id", sysIds),
      signal,
    ),
  );
  const subs = (systems || []).map((s: any) => s.system_id).filter(Boolean);
  if (subs.length === 0) return [];

  const facts: Fact[] = [];

  // ITR rollup — status='complete' means signed/complete (see gohub sync).
  const { data: itrs } = await bounded("source_rollup itrs", DB_TIMEOUT_MS, { data: [] }, (signal) =>
    withAbort(
      sb.from("gohub_itr_items").select("status").in("subsystem_number", subs).in("discipline", disciplines),
      signal,
    ),
  );
  const total = (itrs || []).length;
  const complete = (itrs || []).filter((r: any) => String(r.status || "").toLowerCase() === "complete").length;
  if (total === 0) {
    facts.push({
      label: `${prefix} ITRs in scope`,
      value: `No ${prefix} ITRs in scope`,
      confidence: "verified",
      tone: "neutral",
    });
  } else {
    const outstanding = total - complete;
    facts.push({
      label: `${prefix} ITRs complete`,
      value: `${complete} of ${total}`,
      confidence: "verified",
      tone: outstanding > 0 ? "amber" : "neutral",
    });
  }

  // Punch rollup — gohub_punch_items carries discipline. Open = no cleared_date.
  const { data: punches } = await bounded("source_rollup punches", DB_TIMEOUT_MS, { data: [] }, (signal) =>
    withAbort(
      sb
        .from("gohub_punch_items")
        .select("cleared_date")
        .in("subsystem_number", subs)
        .in("discipline", disciplines)
        .is("cleared_date", null),
      signal,
    ),
  );
  const openPunch = (punches || []).length;
  if (openPunch > 0) {
    facts.push({
      label: `${prefix} punch items open`,
      value: String(openPunch),
      confidence: "verified",
      tone: "amber",
    });
  }
  return facts;
}

// Shared evidence loader — reads VCR evidence from p2a_vcr_evidence keyed by prerequisite
async function loadVcrEvidence(sb: any, prereqId: string | null) {
  if (!prereqId) return [];
  const { data } = await bounded("load vcr evidence", DB_TIMEOUT_MS, { data: [] }, (signal) =>
    withAbort(
      sb
        .from("p2a_vcr_evidence")
        .select("id, file_name, file_path, file_type, evidence_type, created_at")
        .eq("vcr_prerequisite_id", prereqId)
        .order("created_at", { ascending: true }),
      signal,
    ),
  );
  return data || [];
}

const EVIDENCE_BUCKET = "p2a-attachments";

// Expected close-out discipline set per category+display_order. Advisory only.
// Default for DI-03 HEMP/HAZOP close-out: TSE-TA2 sits with Process or HSE.
const EXPECTED_DISCIPLINES: Record<string, string[]> = {
  "DI:3": ["process", "hse", "safety"],
};
function expectedDisciplineSet(categoryCode: string, displayOrder: number | null): string[] {
  const key = `${categoryCode}:${displayOrder ?? ""}`;
  return EXPECTED_DISCIPLINES[key] || [];
}

interface IvanAction {
  action_no?: string;
  node?: string;
  guideword?: string;
  discipline?: string;            // from ACTION ON (fallback RESPOND BY)
  status?: "open" | "closed" | "indeterminate";
  tse_ta2_date?: string | null;   // step-5 date — single source of truth
  source_page?: number;           // 1-based page in the attached PDF
}

const IVAN_SYSTEM_PROMPT = `You are extracting a HEMP/HAZOP action close-out register from a multi-page PDF.
Each action occupies ONE PAGE (a single close-out sheet). The sheets follow the BGC HAZOP Standard format
with fields: ACTION NO, NODE, GUIDEWORD, CAUSE, CONSEQUENCES, SAFEGUARDS, ACTION, ACTION ON, RESPOND BY,
ACTION RESPONSE, and a close-out signature chain in this exact order:
  1) ACTIONEE NAME & SIGN + DATED
  2) LEAD NAME & SIGN + DATED
  3) ACCEPTED BY [ORG] RELEVANT DISCIPLINE TA2 + DATED
  4) ACCEPTED BY [ORG] PROJECT MANAGER + DATED
  5) APPROVED CLOSEOUT BY [ORG] TSE TA2 + DATED   ← THIS is the close-out gate.

RULES (read carefully):
- status = "closed" ONLY when step 5 ("APPROVED CLOSEOUT BY ... TSE TA2") carries a non-empty DATE.
  If that final date field is blank/absent, status = "open" — even when steps 1–4 are signed/dated.
- If the step-5 date field is unreadable (smudged, missing, obscured), status = "indeterminate".
- Match on the role text "TSE TA2"; the org token (BGC, IGC, etc.) varies — ignore the org.
- "discipline" comes from ACTION ON. The leading contractor token (CPECC, MCEC, WOOD, VENDOR, …) is NOT
  the discipline; the trailing token IS (Process, Instrument, Electrical, HSE, Civil/Structural,
  Operations, Mechanical, …). If ACTION ON is empty, fall back to RESPOND BY.
- source_page = the 1-based page index where you read the action FROM THE PROVIDED WINDOW
  (the caller will offset it). One action per page.

Return STRICT JSON with this exact shape — no prose, no markdown:
{"actions":[{"action_no":"string","node":"string","guideword":"string","discipline":"string",
"status":"open|closed|indeterminate","tse_ta2_date":"string|null","source_page":number}]}

Do not invent actions. If the window contains no readable register pages, return {"actions":[]}.`;

function normaliseDiscipline(raw?: string): string {
  if (!raw) return "";
  // Strip the leading contractor token (CPECC, MCEC, WOOD, VENDOR, …) ONLY.
  // Split on hyphen / en-dash / em-dash separators with surrounding whitespace,
  // take the last segment, and keep compound disciplines intact:
  //   "MCEC - Civil/Structural" → "civil/structural"
  //   "WOOD – Process"          → "process"
  // Do NOT split on "/" — that fragments compound disciplines.
  const cleaned = raw.replace(/^[\s\-:/]+|[\s\-:/]+$/g, "");
  const parts = cleaned.split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean);
  const tail = parts[parts.length - 1] || cleaned;
  return tail.toLowerCase();
}
function isExpectedDiscipline(disc: string, expected: string[]): boolean {
  if (expected.length === 0) return true; // no expectation configured → never flag wrong-discipline
  const d = normaliseDiscipline(disc);
  if (!d) return true; // unknown discipline → don't flag (honest)
  return expected.some((e) => d.includes(e) || e.includes(d));
}

async function ivanExtractWindow(
  lovableKey: string,
  pdfBytes: Uint8Array,
  filename: string,
  pageOffset: number,
): Promise<IvanAction[] | null> {
  const b64 = bytesToBase64(pdfBytes);
  const r = await bounded<Response | null>("ivan ai window", AI_TIMEOUT_MS, null, (signal) =>
    fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: IVAN_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract every HEMP/HAZOP action sheet visible in this window." },
              {
                type: "file",
                file: { filename, file_data: `data:application/pdf;base64,${b64}` },
              },
            ],
          },
        ],
      }),
    }),
  );
  if (!r || !r.ok) return null;
  try {
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(typeof txt === "string" ? txt : "{}");
    const arr: IvanAction[] = Array.isArray(parsed?.actions) ? parsed.actions : [];
    return arr.map((a) => ({
      ...a,
      source_page: typeof a.source_page === "number" ? a.source_page + pageOffset : undefined,
    }));
  } catch (_e) {
    return null;
  }
}

// ─── Ivan: DI-03 HEMP action-register reader (topic-scoped) ───────────────
// Real registers are large compiled PDFs (~32 MB, ~396 pages, one action per
// page). Ivan is bounded: hard wall-clock, size guard, page cap with windowing
// via pdf-lib, per-action source-page links, and honest partial counts.
async function ivanHempReader(sb: any, item: any, lovableKey: string): Promise<Fact[]> {
  const categoryCode = item?.category_code;
  const displayOrder = item?.display_order;
  const isDi03 = categoryCode === "DI" && displayOrder === 3;
  if (!isDi03) {
    return [{ label: "HEMP register check", value: "Not applicable for this item", confidence: "unavailable" }];
  }

  const atts = await loadVcrEvidence(sb, item.prerequisite_id);
  const isRegisterLike = (a: any) => {
    const hay = `${a.file_name || ""} ${a.evidence_type || ""}`.toLowerCase();
    return /(hemp|hazop|action[\s_-]*register|close[\s_-]*out)/i.test(hay);
  };
  const pdf = atts.find((a: any) =>
    (/pdf/i.test(a.file_type || "") || /\.pdf$/i.test(a.file_name || "")) && isRegisterLike(a),
  );
  if (!pdf) {
    return [{
      label: "HEMP register",
      value: "No HEMP/HAZOP action register attached",
      confidence: "unavailable",
      tone: "amber",
    }];
  }

  const { data: signed } = await bounded("ivan signed url", DB_TIMEOUT_MS, { data: null }, () =>
    sb.storage.from(EVIDENCE_BUCKET).createSignedUrl(pdf.file_path, 60 * 60),
  );
  const sourceHref: string | undefined = signed?.signedUrl;
  if (!sourceHref) {
    return [{ label: "HEMP register", value: "Attachment link unavailable", confidence: "unavailable" }];
  }
  const pageHref = (page?: number) =>
    page && Number.isFinite(page) ? `${sourceHref}#page=${page}` : sourceHref;

  // Bounded download
  let pdfBytes: Uint8Array | null = null;
  try {
    pdfBytes = await bounded<Uint8Array | null>("ivan pdf download", STORAGE_TIMEOUT_MS, null, async (signal) => {
      const response = await fetch(sourceHref, { signal });
      if (!response.ok) return null;
      const contentLength = Number(response.headers.get("content-length") || 0);
      if (contentLength && contentLength > MAX_PDF_BYTES) return null;
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_PDF_BYTES) return null;
      return new Uint8Array(buffer);
    });
  } catch (_e) {
    return [{ label: "HEMP register", value: "Attachment unreadable", confidence: "unavailable", sourceHref }];
  }
  if (!pdfBytes) {
    return [{
      label: "HEMP register",
      value: "Attachment too large or unreachable",
      confidence: "unavailable",
      tone: "amber",
      sourceHref,
    }];
  }
  if (!lovableKey) {
    return [{ label: "HEMP register AI read", value: "AI gateway not connected", confidence: "unavailable", sourceHref }];
  }

  // Page count + window plan
  let totalPages = 0;
  let baseDoc: PDFDocument | null = null;
  try {
    baseDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    totalPages = baseDoc.getPageCount();
  } catch (_e) {
    return [{ label: "HEMP register", value: "PDF could not be parsed", confidence: "unavailable", sourceHref }];
  }

  const oversized = pdfBytes.byteLength > IVAN_INLINE_BYTE_LIMIT || totalPages > IVAN_PAGE_BUDGET;
  const pagesToAnalyse = Math.min(totalPages, IVAN_PAGE_BUDGET);
  const partial = pagesToAnalyse < totalPages;

  const t0 = Date.now();
  const collected: IvanAction[] = [];

  const runWindow = async (startIdx: number, endIdx: number): Promise<boolean> => {
    if (Date.now() - t0 > IVAN_WALL_BUDGET_MS) return false;
    let windowBytes: Uint8Array;
    if (!oversized && startIdx === 0 && endIdx === totalPages) {
      windowBytes = pdfBytes!;
    } else {
      try {
        const sub = await PDFDocument.create();
        const indices = Array.from({ length: endIdx - startIdx }, (_, i) => startIdx + i);
        const copied = await sub.copyPages(baseDoc!, indices);
        copied.forEach((p) => sub.addPage(p));
        windowBytes = await sub.save();
      } catch (_e) {
        return false;
      }
    }
    const actions = await ivanExtractWindow(lovableKey, windowBytes, pdf.file_name || "hemp.pdf", startIdx);
    if (actions && actions.length) collected.push(...actions);
    return actions !== null;
  };

  if (!oversized) {
    await runWindow(0, totalPages);
  } else {
    // Overlap windows so any action straddling a single 20-page boundary is
    // wholly contained in at least one window. Advance by stride < window size.
    const stride = Math.max(1, IVAN_WINDOW_PAGES - IVAN_WINDOW_OVERLAP);
    for (let start = 0; start < pagesToAnalyse; start += stride) {
      const end = Math.min(start + IVAN_WINDOW_PAGES, pagesToAnalyse);
      if (Date.now() - t0 > IVAN_WALL_BUDGET_MS) break;
      await runWindow(start, end);
      if (end >= pagesToAnalyse) break;
    }
  }

  if (collected.length === 0) {
    return [{
      label: "HEMP actions found",
      value: partial ? `0 (partial — analysed ${pagesToAnalyse} of ${totalPages} pages)` : "0",
      confidence: "ai_read",
      tone: "amber",
      sourceHref,
    }];
  }

  // Belt-and-braces orphan-fragment fallback: a fragment with a step-5 TSE-TA2
  // date but no action_no AND no header fields (node/guideword) is a close-out
  // continuation page whose header lives on an earlier page. Attach it to the
  // nearest preceding action_no in page order. Overlapping windows handle the
  // common case; this catches anything that still slips through.
  const inPageOrder = [...collected].sort(
    (a, b) => (a.source_page ?? Number.MAX_SAFE_INTEGER) - (b.source_page ?? Number.MAX_SAFE_INTEGER),
  );
  const dropped = new Set<number>();
  let lastHeaderIdx = -1;
  for (let i = 0; i < inPageOrder.length; i++) {
    const a = inPageOrder[i];
    const isOrphanCloseOut = !a.action_no && !a.node && !a.guideword && !!a.tse_ta2_date;
    if (!isOrphanCloseOut) {
      if (a.action_no) lastHeaderIdx = i;
      continue;
    }
    if (lastHeaderIdx >= 0) {
      const header = inPageOrder[lastHeaderIdx];
      if (!header.tse_ta2_date) header.tse_ta2_date = a.tse_ta2_date;
      header.status = "closed";
      dropped.add(i);
    }
  }
  const cleanedActions = inPageOrder.filter((_, i) => !dropped.has(i));

  // Dedupe by action_no MERGING field-by-field across windows.
  // Critical when one action straddles a 20-page window boundary: its
  // ACTION NO header may land in window N and the step-5 TSE-TA2 date in
  // window N+1. First-wins would freeze the status as "open" even when
  // the closeout is present. Rule: a definitive step-5 date wins over
  // open/indeterminate; the more-complete field set wins on ties.
  const statusRank: Record<string, number> = { closed: 3, open: 2, indeterminate: 1 };
  const byKey = new Map<string, IvanAction>();
  for (const a of cleanedActions) {
    const key = (a.action_no || `${a.source_page ?? "?"}::${a.node ?? ""}`).trim();
    const prev = byKey.get(key);
    if (!prev) { byKey.set(key, { ...a }); continue; }
    const merged: IvanAction = { ...prev };
    // Step-5 date is the source of truth: any non-empty wins.
    if (a.tse_ta2_date && !prev.tse_ta2_date) merged.tse_ta2_date = a.tse_ta2_date;
    // Status: highest-rank wins (closed > open > indeterminate).
    const ra = statusRank[a.status || "indeterminate"] || 0;
    const rp = statusRank[prev.status || "indeterminate"] || 0;
    if (ra > rp) merged.status = a.status;
    // Fill any blank scalar field from the other record.
    for (const k of ["node", "guideword", "discipline", "source_page"] as const) {
      if (merged[k] == null && a[k] != null) (merged as any)[k] = a[k];
    }
    // If we now have a TSE-TA2 date but status is still open/indeterminate, promote to closed.
    if (merged.tse_ta2_date && merged.status !== "closed") merged.status = "closed";
    byKey.set(key, merged);
  }
  const actions = Array.from(byKey.values());

  const open = actions.filter((a) => a.status === "open");
  const closed = actions.filter((a) => a.status === "closed");
  const indeterminate = actions.filter((a) => a.status === "indeterminate");

  const expected = expectedDisciplineSet(categoryCode, displayOrder);
  const wrongDiscipline = open.filter((a) => !isExpectedDiscipline(a.discipline || "", expected));

  // Discipline breakdown across all readable actions
  const disciplineBreakdown = new Map<string, number>();
  for (const a of actions) {
    const d = normaliseDiscipline(a.discipline);
    if (!d) continue;
    disciplineBreakdown.set(d, (disciplineBreakdown.get(d) || 0) + 1);
  }

  const partialSuffix = partial ? ` (partial — analysed ${pagesToAnalyse} of ${totalPages} pages)` : "";
  const partialLowerBound = (n: number) => (partial ? `≥${n}${partialSuffix}` : String(n));

  const firstOpenPage = open[0]?.source_page;
  const firstWrongPage = wrongDiscipline[0]?.source_page;

  const facts: Fact[] = [
    {
      label: "HEMP/HAZOP actions — open",
      value: partialLowerBound(open.length),
      confidence: "ai_read",
      tone: open.length > 0 ? "red" : "neutral",
      sourceHref: pageHref(firstOpenPage),
    },
    {
      label: "Actions closed (TSE-TA2 approved)",
      value: partialLowerBound(closed.length),
      confidence: "ai_read",
      tone: "neutral",
      sourceHref,
    },
  ];
  if (expected.length > 0) {
    const openNos = wrongDiscipline.map((a) => a.action_no).filter(Boolean).slice(0, 6).join(", ");
    facts.push({
      label: "Open actions outside expected discipline",
      value: wrongDiscipline.length === 0
        ? partialLowerBound(0)
        : `${partialLowerBound(wrongDiscipline.length)}${openNos ? ` — ${openNos}` : ""}`,
      confidence: "ai_read",
      tone: wrongDiscipline.length > 0 ? "amber" : "neutral",
      sourceHref: pageHref(firstWrongPage),
    });
  }
  if (indeterminate.length > 0) {
    facts.push({
      label: "Actions with unreadable TSE-TA2 line",
      value: String(indeterminate.length),
      confidence: "ai_read",
      tone: "amber",
      sourceHref,
    });
  }
  if (disciplineBreakdown.size > 0) {
    const breakdown = Array.from(disciplineBreakdown.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([d, n]) => `${d}:${n}`)
      .join(", ");
    facts.push({
      label: "Discipline breakdown",
      value: breakdown,
      confidence: "ai_read",
      tone: "neutral",
    });
  }
  return facts;
}

// ─────────────────────────────────────────────────────────────────────────
// RegisterReader (schema-driven generalisation of Ivan's machinery)
//
// Ivan's HEMP/HAZOP reader is per-page. Many other advisory reads on
// attached registers are per-row on a single-page matrix (start-up
// notification acknowledgment sheets, permit registers, …). This engine
// pulls the schema-agnostic bits — bounded download, size guard, page
// count, single-shot AI extraction, honest partials, page-linked facts —
// into one function driven by a RegisterSchema. HEMP schema (page-unit)
// keeps its dedicated reader (ivanHempReader) so behaviour is byte-
// identical; the schema entry aliases to it. Table-row schemas run here.
// ─────────────────────────────────────────────────────────────────────────

interface RegisterSchemaBase {
  schema_key: string;
  doc_match: RegExp;          // matches on file_name/evidence_type
  row_unit: "page" | "table_row";
  system_prompt: string;
  record_shape: string;       // JSON shape hint used in the prompt
}
interface TableRowSchema extends RegisterSchemaBase {
  row_unit: "table_row";
  record_key: string;         // unique key field in each record (e.g. "unit")
  closed_field: string;       // field that being non-empty marks the row "done"
  labels: {
    docType: string;          // human phrase e.g. "notification sheet"
    countLabel: string;       // "Units acknowledged"
    countUnit: string;        // "units"
    outstandingLabel: string; // "Awaiting acknowledgement"
    outstandingItem: string;  // "acknowledgement"
  };
}
interface PageRegisterSchema extends RegisterSchemaBase {
  row_unit: "page";
  // Delegated to ivanHempReader — HEMP-specific fields live in that fn.
}
type RegisterSchema = TableRowSchema | PageRegisterSchema;

const SCHEMA_HEMP_DI03: PageRegisterSchema = {
  schema_key: "hemp_di03",
  doc_match: /(hemp|hazop|action[\s_-]*register|close[\s_-]*out)/i,
  row_unit: "page",
  system_prompt: IVAN_SYSTEM_PROMPT,
  record_shape: "IvanAction",
};

const SCHEMA_SU_NOTIFICATION_OI: TableRowSchema = {
  schema_key: "su_notification",
  doc_match: /(notification|acknowledg|start[\s_-]*up.*(comms|notice|ack))/i,
  row_unit: "table_row",
  record_key: "unit",
  closed_field: "acknowledged",
  labels: {
    docType: "notification sheet",
    countLabel: "Units acknowledged",
    countUnit: "units",
    outstandingLabel: "Awaiting acknowledgement",
    outstandingItem: "acknowledgement",
  },
  record_shape:
    '{"unit":"string","notified":"string (date or method, or empty)",' +
    '"acknowledged":"string (acknowledger name + date, or empty if outstanding)",' +
    '"source_page":"integer (1-based page in the PDF)"}',
  system_prompt:
    'You are extracting a start-up NOTIFICATION & ACKNOWLEDGMENT sheet from a ' +
    'PDF. Each row is one affected unit or department (Operations, Maintenance, ' +
    'HSE, Utilities, Marine, …). Columns typically include UNIT/DEPARTMENT, ' +
    'NOTIFIED (date or method), and ACKNOWLEDGED (name + date). A unit counts ' +
    'as ACKNOWLEDGED only when the acknowledgement cell carries a non-empty ' +
    'value (name and/or date). Placeholders such as "—", "-", "N/A", "TBD", ' +
    '"pending", or blank all count as NOT acknowledged. Do not invent units. ' +
    'source_page is the 1-based page where you read the row. Return STRICT ' +
    'JSON, no prose, no markdown:\n' +
    '{"records":[{"unit":"string","notified":"string","acknowledged":"string",' +
    '"source_page":number}]}',
};

const REGISTER_SCHEMAS: Record<string, RegisterSchema> = {
  hemp_di03: SCHEMA_HEMP_DI03,
  su_notification: SCHEMA_SU_NOTIFICATION_OI,
};

async function tableRowExtract(
  lovableKey: string,
  pdfBytes: Uint8Array,
  filename: string,
  schema: TableRowSchema,
): Promise<Array<Record<string, any>> | null> {
  const b64 = bytesToBase64(pdfBytes);
  const r = await bounded<Response | null>("register_reader ai", AI_TIMEOUT_MS, null, (signal) =>
    fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: schema.system_prompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Extract every row from this ${schema.labels.docType}.` },
              { type: "file", file: { filename, file_data: `data:application/pdf;base64,${b64}` } },
            ],
          },
        ],
      }),
    }),
  );
  if (!r || !r.ok) return null;
  try {
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(typeof txt === "string" ? txt : "{}");
    return Array.isArray(parsed?.records) ? parsed.records : [];
  } catch (_e) {
    return null;
  }
}

function isRowClosed(row: Record<string, any>, field: string): boolean {
  const v = row?.[field];
  if (v === true) return true;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  if (!s) return false;
  return !["—", "-", "n/a", "na", "tbd", "pending", "outstanding", "none"].includes(s);
}

async function registerReaderTableRow(
  sb: any,
  item: any,
  lovableKey: string,
  schema: TableRowSchema,
): Promise<Fact[]> {
  const atts = await loadVcrEvidence(sb, item.prerequisite_id);
  const matches = (a: any) => {
    const hay = `${a.file_name || ""} ${a.evidence_type || ""}`;
    return schema.doc_match.test(hay);
  };
  const pdf = atts.find((a: any) =>
    (/pdf/i.test(a.file_type || "") || /\.pdf$/i.test(a.file_name || "")) && matches(a),
  );
  if (!pdf) {
    // Zero-evidence is already owned by evidenceMatchEngine. Stay silent.
    return [];
  }

  const { data: signed } = await bounded("register_reader signed url", DB_TIMEOUT_MS, { data: null }, () =>
    sb.storage.from(EVIDENCE_BUCKET).createSignedUrl(pdf.file_path, 60 * 60),
  );
  const sourceHref: string | undefined = signed?.signedUrl;
  if (!sourceHref) {
    return [{ label: schema.labels.countLabel, value: "Attachment link unavailable", confidence: "unavailable" }];
  }
  const pageHref = (p?: number) => (p && Number.isFinite(p) ? `${sourceHref}#page=${p}` : sourceHref);

  let pdfBytes: Uint8Array | null = null;
  try {
    pdfBytes = await bounded<Uint8Array | null>("register_reader download", STORAGE_TIMEOUT_MS, null, async (signal) => {
      const response = await fetch(sourceHref, { signal });
      if (!response.ok) return null;
      const cl = Number(response.headers.get("content-length") || 0);
      if (cl && cl > MAX_PDF_BYTES) return null;
      const buf = await response.arrayBuffer();
      if (buf.byteLength > MAX_PDF_BYTES) return null;
      return new Uint8Array(buf);
    });
  } catch (_e) {
    return [{ label: schema.labels.countLabel, value: "Attachment unreadable", confidence: "unavailable", sourceHref }];
  }
  if (!pdfBytes) {
    return [{ label: schema.labels.countLabel, value: "Attachment too large or unreachable", confidence: "unavailable", tone: "amber", sourceHref }];
  }
  if (!lovableKey) {
    return [{ label: schema.labels.countLabel, value: "AI gateway not connected", confidence: "unavailable", sourceHref }];
  }

  // Single-shot: notification/ack sheets are typically 1–2 pages. If the doc
  // exceeds the page budget we still send it (small enough by byte cap).
  const records = await tableRowExtract(lovableKey, pdfBytes, pdf.file_name || "register.pdf", schema);
  if (!records) {
    return [{ label: schema.labels.countLabel, value: "AI read failed", confidence: "unavailable", sourceHref }];
  }

  // Dedupe by record_key (last-wins for cell fills).
  const byKey = new Map<string, Record<string, any>>();
  for (const rec of records) {
    const k = String(rec?.[schema.record_key] || "").trim();
    if (!k) continue;
    const prev = byKey.get(k) || {};
    byKey.set(k, { ...prev, ...rec });
  }
  const rows = Array.from(byKey.values());
  const total = rows.length;

  if (total === 0) {
    return [{
      label: schema.labels.countLabel,
      value: "No readable rows",
      tone: "amber",
      confidence: "ai_read",
      sourceHref,
    }];
  }

  const closed = rows.filter((r) => isRowClosed(r, schema.closed_field));
  const outstanding = rows.filter((r) => !isRowClosed(r, schema.closed_field));
  const firstOutstandingPage =
    typeof outstanding[0]?.source_page === "number" ? outstanding[0].source_page : undefined;

  const facts: Fact[] = [{
    label: schema.labels.countLabel,
    value: `${closed.length} of ${total}`,
    tone: closed.length < total ? "amber" : "neutral",  // ai_read never red — guardrail
    confidence: "ai_read",
    sourceHref: pageHref(firstOutstandingPage),
  }];

  if (outstanding.length > 0) {
    const names = outstanding
      .map((r) => String(r?.[schema.record_key] || "").trim())
      .filter(Boolean)
      .slice(0, 6);
    facts.push({
      label: schema.labels.outstandingLabel,
      value: names.join(", ") || `${outstanding.length} ${schema.labels.countUnit}`,
      tone: "amber",
      confidence: "ai_read",
      sourceHref: pageHref(firstOutstandingPage),
    });
  }

  return facts;
}

async function registerReaderEngine(
  sb: any,
  item: any,
  lovableKey: string,
  schemaKey: string,
): Promise<Fact[]> {
  const schema = REGISTER_SCHEMAS[schemaKey];
  if (!schema) {
    return [{
      label: "Register reader",
      value: `Unknown schema '${schemaKey}'`,
      confidence: "unavailable",
    }];
  }
  if (schema.row_unit === "page") {
    // HEMP page-unit reader — keep the existing implementation verbatim so
    // DI-03 behaviour is byte-identical to pre-refactor.
    if (schema.schema_key === "hemp_di03") return ivanHempReader(sb, item, lovableKey);
  }
  if (schema.row_unit === "table_row") {
    return registerReaderTableRow(sb, item, lovableKey, schema);
  }
  return [];
}



// ─── Selma: attachment revision pass (runs on EVERY item) ─────────────────
async function selmaRevisionPass(sb: any, item: any): Promise<Fact[]> {
  const atts = await loadVcrEvidence(sb, item.prerequisite_id);
  if (atts.length === 0) {
    // Zero-evidence gap is owned by evidenceMatchEngine (E1); Selma stays silent here.
    return [];
  }
  const facts: Fact[] = [];
  for (const a of atts) {
    const stem = (a.file_name || "").replace(/\.[^.]+$/, "");
    const { data: docs } = await bounded("selma dms revision", DB_TIMEOUT_MS, { data: [] }, (signal) =>
      withAbort(
        sb
          .from("dms_external_sync")
          .select("document_number, revision, status_code, metadata")
          .ilike("document_number", stem ? `%${stem.slice(0, 30)}%` : "%__none__%")
          .limit(1),
        signal,
      ),
    );
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

// ─── Parse requirement labels (same rule as the drawer chip splitter) ─────
function parseEvidenceLabels(raw: string | null | undefined): string[] {
  return (raw || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const EVIDENCE_MATCH_MODEL = "google/gemini-2.5-flash-lite";

async function classifyEvidenceAgainstRequirement(
  lovableKey: string,
  fileName: string,
  evidenceType: string,
  requirementText: string,
): Promise<{ verdict: "match" | "related" | "unrelated"; reason: string } | null> {
  const r = await bounded<Response | null>("evidence_match ai", AI_TIMEOUT_MS, null, (signal) =>
    fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: EVIDENCE_MATCH_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You classify whether an uploaded evidence file matches a requirement, based ONLY on the filename and declared evidence type (no file contents). Return STRICT JSON: {"verdict":"match|related|unrelated","reason":"<=12 words"}. "match" = clearly the required artifact; "related" = same topic/system, wrong document; "unrelated" = different topic.',
          },
          {
            role: "user",
            content: `Requirement: ${requirementText}\nFile: ${fileName}\nEvidence type: ${evidenceType || "(unspecified)"}`,
          },
        ],
      }),
    }),
  );
  if (!r || !r.ok) return null;
  try {
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(typeof txt === "string" ? txt : "{}");
    const verdict = parsed?.verdict;
    if (verdict !== "match" && verdict !== "related" && verdict !== "unrelated") return null;
    const reason = String(parsed?.reason || "").slice(0, 120);
    return { verdict, reason };
  } catch (_e) {
    return null;
  }
}

// ─── Engine E1: EvidenceMatch (deterministic count + AI per-file check) ───
async function evidenceMatchEngine(sb: any, item: any, lovableKey: string): Promise<Fact[]> {
  const requiredLabels = parseEvidenceLabels(item.supporting_evidence);
  const uploads = await loadVcrEvidence(sb, item.prerequisite_id);
  const facts: Fact[] = [];

  const n = uploads.length;
  const m = requiredLabels.length;

  // Only surface the count when it is a real gap (0 files, requirement exists).
  // Neutral counts (n>0 or m===0) add nothing the Evidence section doesn't already show.
  if (n === 0 && m > 0) {
    facts.push({
      label: "Required evidence attached",
      value: `${n} file(s) against ${m} requirement(s)`,
      tone: "amber",
      confidence: "verified",
    });
  }

  if (m === 0 || n === 0 || !lovableKey) return facts;

  // Combined requirement text for classification input
  const requirementText = requiredLabels.join("; ");
  const reqHash = await sha(requirementText);

  for (const up of uploads) {
    // Cache lookup
    const { data: cached } = await bounded("evidence_match cache read", DB_TIMEOUT_MS, { data: null }, (signal) =>
      withAbort(
        sb
          .from("evidence_match_cache")
          .select("verdict, reason")
          .eq("evidence_id", up.id)
          .eq("req_hash", reqHash)
          .maybeSingle(),
        signal,
      ),
    );
    let verdict = (cached as any)?.verdict as "match" | "related" | "unrelated" | undefined;
    let reason = (cached as any)?.reason as string | undefined;

    if (!verdict) {
      const ai = await classifyEvidenceAgainstRequirement(
        lovableKey,
        up.file_name || "",
        up.evidence_type || "",
        requirementText,
      );
      if (!ai) continue; // silent skip on failure/timeout — never guess
      verdict = ai.verdict;
      reason = ai.reason;
      await bounded("evidence_match cache write", DB_TIMEOUT_MS, null, (signal) =>
        withAbort(
          sb.from("evidence_match_cache").upsert(
            { evidence_id: up.id, req_hash: reqHash, verdict, reason },
            { onConflict: "evidence_id,req_hash" },
          ),
          signal,
        ),
      );
    }

    if (verdict === "match") continue; // only surface non-matching files

    const { data: signed } = await bounded("evidence_match signed url", DB_TIMEOUT_MS, { data: null }, () =>
      sb.storage.from(EVIDENCE_BUCKET).createSignedUrl(up.file_path, 60 * 60),
    );

    facts.push({
      label: `Evidence check: ${up.file_name}`,
      value: `${verdict} — ${reason || ""}`.trim(),
      tone: verdict === "unrelated" ? "amber" : "neutral", // ai_read never red (guardrail)
      confidence: "ai_read",
      sourceHref: (signed as any)?.signedUrl,
    });
  }

  return facts;
}

// ─── Engine E5: WorkflowSignals (pure SQL, verified confidence) ───────────
function daysBetween(a: Date | null | undefined, b: Date): number {
  if (!a) return 0;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

async function workflowSignalsEngine(sb: any, item: any, prereq: any): Promise<Fact[]> {
  const facts: Fact[] = [];
  const now = new Date();
  const prereqId = item.prerequisite_id;
  const vcrItemId = item.id;
  const vcrId = item.handover_point_id;
  if (!prereqId) return facts;

  // Reload full prereq row for timestamps + party ids
  const { data: pr } = await bounded("workflow prereq load", DB_TIMEOUT_MS, { data: null }, (signal) =>
    withAbort(
      sb
        .from("p2a_vcr_prerequisites")
        .select("id, status, submitted_at, reviewed_at, updated_at, created_at, delivering_party_id, delivering_party_name, receiving_party_id, receiving_party_name")
        .eq("id", prereqId)
        .maybeSingle(),
      signal,
    ),
  );
  if (!pr) return facts;

  // 1) Status + aging (always emitted)
  const status = (pr as any).status || "UNKNOWN";
  const anchor = (pr as any).submitted_at || (pr as any).updated_at || (pr as any).created_at;
  const days = daysBetween(anchor ? new Date(anchor) : null, now);
  let statusTone: Tone = "neutral";
  if (status === "READY_FOR_REVIEW" && days > 7) statusTone = "amber";
  else if (status === "IN_PROGRESS" && days > 21) statusTone = "amber";
  facts.push({
    label: "Status",
    value: `${status} · ${days} days`,
    tone: statusTone,
    confidence: "verified",
  });

  // 2, 3) Comment-based signals
  const { data: comments } = await bounded("workflow comments", DB_TIMEOUT_MS, { data: [] }, (signal) =>
    withAbort(
      sb
        .from("vcr_item_comments")
        .select("id, author_user_id, body, action_tag, created_at")
        .eq("vcr_item_id", vcrItemId)
        .eq("handover_point_id", vcrId)
        .order("created_at", { ascending: true }),
      signal,
    ),
  );
  const cs = (comments || []) as any[];
  const returned = cs.filter((c) => (c.action_tag || "").toLowerCase() === "returned");
  if (returned.length >= 1) {
    facts.push({
      label: "Returned by approver",
      value: `${returned.length}×`,
      tone: returned.length >= 2 ? "red" : "amber",
      confidence: "verified",
    });
  }

  // Unanswered approver comment — resolve party membership via RLS helpers
  if (cs.length > 0) {
    const last = cs[cs.length - 1];
    const authorId = last.author_user_id;
    if (authorId) {
      const { data: isApprover } = await bounded("is approver check", DB_TIMEOUT_MS, { data: false }, () =>
        sb.rpc("is_vcr_item_approving_party", {
          _user_id: authorId,
          _vcr_item_id: vcrItemId,
          _handover_point_id: vcrId,
        }),
      );
      if (isApprover === true) {
        // Any later delivering-party reply?
        let hasReply = false;
        for (const c of cs.filter((c) => new Date(c.created_at) > new Date(last.created_at))) {
          const { data: isDeliv } = await bounded("is deliv check", DB_TIMEOUT_MS, { data: false }, () =>
            sb.rpc("is_vcr_item_delivering_party", {
              _user_id: c.author_user_id,
              _vcr_item_id: vcrItemId,
              _handover_point_id: vcrId,
            }),
          );
          if (isDeliv === true) { hasReply = true; break; }
        }
        if (!hasReply) {
          const d = daysBetween(new Date(last.created_at), now);
          facts.push({
            label: "Approver comment awaiting reply",
            value: `${d} days`,
            tone: "amber",
            confidence: "verified",
          });
        }
      }
    }
  }

  // 4) Open qualification (join through vcr_prerequisite_id; status stands in for stage)
  const { data: quals } = await bounded("workflow quals", DB_TIMEOUT_MS, { data: [] }, (signal) =>
    withAbort(
      sb
        .from("p2a_vcr_qualifications")
        .select("id, status, submitted_at, updated_at, created_at")
        .eq("vcr_prerequisite_id", prereqId),
      signal,
    ),
  );
  const openQual = ((quals || []) as any[]).find((q) => {
    const s = String(q.status || "").toUpperCase();
    return s && !["APPROVED", "REJECTED", "CLOSED", "COMPLETED"].includes(s);
  });
  if (openQual || status === "QUALIFICATION_REQUESTED") {
    const q = openQual as any;
    const qAnchor = q?.submitted_at || q?.updated_at || q?.created_at;
    const qDays = daysBetween(qAnchor ? new Date(qAnchor) : null, now);
    facts.push({
      label: "Qualification open",
      value: `${q?.status || "QUALIFICATION_REQUESTED"} · ${qDays} days`,
      tone: "amber",
      confidence: "verified",
    });
  }

  // 5) Party health — effective role unassigned
  // Effective delivering/approving role resolution lives at the item level.
  const { data: itemRoles } = await bounded("workflow item roles", DB_TIMEOUT_MS, { data: null }, (signal) =>
    withAbort(
      sb
        .from("vcr_items")
        .select("delivering_party_role_id, approving_party_role_ids")
        .eq("id", vcrItemId)
        .maybeSingle(),
      signal,
    ),
  );
  const projectId = (item as any).project_id || null;
  const checkRole = async (roleId: string | null | undefined): Promise<{ has: boolean; roleName: string | null }> => {
    if (!roleId) return { has: true, roleName: null };
    const { data: roleRow } = await bounded("workflow role name", DB_TIMEOUT_MS, { data: null }, (signal) =>
      withAbort(sb.from("roles").select("name").eq("id", roleId).maybeSingle(), signal),
    );
    const roleName = (roleRow as any)?.name || null;
    if (!roleName || !projectId) return { has: true, roleName };
    const { data: r } = await bounded("workflow resolve role", DB_TIMEOUT_MS, { data: null }, () =>
      sb.rpc("resolve_project_role_user", { p_project_id: projectId, p_role_label: roleName }),
    );
    return { has: r != null, roleName };
  };
  if (projectId) {
    const deliv = await checkRole((itemRoles as any)?.delivering_party_role_id);
    if (!deliv.has) {
      facts.push({
        label: "Unassigned role",
        value: deliv.roleName ? `Delivering: ${deliv.roleName}` : "Delivering party",
        tone: "red",
        confidence: "verified",
      });
    }
    for (const rid of ((itemRoles as any)?.approving_party_role_ids || []) as string[]) {
      const ap = await checkRole(rid);
      if (!ap.has) {
        facts.push({
          label: "Unassigned role",
          value: ap.roleName ? `Approving: ${ap.roleName}` : "Approving party",
          tone: "red",
          confidence: "verified",
        });
      }
    }
  }

  // 6) Evidence provenance
  const { data: ev } = await bounded("workflow evidence", DB_TIMEOUT_MS, { data: [] }, (signal) =>
    withAbort(
      sb
        .from("p2a_vcr_evidence")
        .select("id, source, confirmed, created_at")
        .eq("vcr_prerequisite_id", prereqId),
      signal,
    ),
  );
  const evRows = (ev || []) as any[];
  const assaiPending = evRows.filter(
    (e) => String(e.source || "").toLowerCase() === "assai" && e.confirmed === false,
  );
  if (assaiPending.length > 0) {
    facts.push({
      label: "Assai evidence awaiting confirmation",
      value: String(assaiPending.length),
      tone: "amber",
      confidence: "verified",
    });
  }
  const submittedAt = (pr as any).submitted_at ? new Date((pr as any).submitted_at) : null;
  if (submittedAt && status === "READY_FOR_REVIEW") {
    const lateFiles = evRows.filter((e) => new Date(e.created_at) > submittedAt);
    if (lateFiles.length > 0) {
      facts.push({
        label: "Evidence added after submission",
        value: `${lateFiles.length} file(s)`,
        tone: "red",
        confidence: "verified",
      });
    }
  }

  // Signal 7 (item-level tasks) — deferred pending EXE-1. Intentionally omitted.
  return facts;
}

function nextStepForFact(f: Fact | undefined, allFacts: Fact[] = []): string | null {
  if (!f) return null;
  const l = f.label.toLowerCase();
  if (l.includes("returned by approver")) return "Address the approver's return reason in the thread before resubmitting.";
  if (l.includes("unassigned role")) return "Assign the missing role before this item can progress.";
  if (l.includes("approver comment awaiting reply")) return "Reply to the approver's comment in the thread.";
  if (l.includes("qualification open")) return "Close the open qualification before submitting.";
  if (l.includes("evidence added after submission")) return "Re-submit so the approver reviews the latest evidence.";
  if (l.includes("evidence check")) return "Review the flagged file — it may be unrelated to the requirement.";
  if (l.includes("required evidence attached") && f.tone === "amber") return "Attach the required evidence before submitting.";
  if (l.includes("assai evidence")) return "Confirm the Assai-sourced evidence.";
  // Register-reader: acknowledgement schema (OI-19). Both facts route to the
  // same next step — chase the outstanding units named in "Awaiting acknowledgement".
  if (l.includes("awaiting acknowledgement") || (l.includes("units acknowledged") && f.tone === "amber")) {
    const outstanding = allFacts.find((x) => (x.label || "").toLowerCase() === "awaiting acknowledgement");
    const raw = (outstanding?.value || f.value || "").trim();
    if (raw) {
      const names = raw.split(/\s*,\s*/).filter(Boolean);
      let phrase: string;
      if (names.length === 0) phrase = "the outstanding units";
      else if (names.length <= 3) {
        phrase = names.length === 1
          ? names[0]
          : names.length === 2
          ? `${names[0]} and ${names[1]}`
          : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
      } else {
        phrase = `${names.slice(0, 3).join(", ")} and others`;
      }
      return `Chase acknowledgement from ${phrase} before submitting.`;
    }
    return "Chase acknowledgement from the outstanding units before submitting.";
  }
  // Register-reader: HEMP/HAZOP schema (DI-03).
  if (l.includes("hemp/hazop actions") && l.includes("open")) {
    return "Close the open HEMP actions (TSE-TA2 sign-off) before submitting.";
  }
  return null;
}

// ─── Bob composer ─────────────────────────────────────────────────────────

function composeSeverity(facts: Fact[]): "green" | "amber" | "red" {
  if (facts.some((f) => f.tone === "red")) return "red";
  if (facts.some((f) => f.tone === "amber")) return "amber";
  return "green";
}
// Deterministic label → short SME phrase map (no LLM, no value restatement).
const HEADLINE_PHRASES: Record<string, string> = {
  "evidence check": "evidence may not match the requirement",
  "required evidence attached": "required evidence not yet attached",
  "required documents attached": "required documents not yet attached",
  "cat-a punch items": "Cat-A punch items outstanding",
  "cat-a punch outstanding": "Cat-A punch items outstanding",
  "outdated revision": "an attached document is on an outdated revision",
  "returned by approver": "item was returned by the approver",
  "unanswered approver comment": "an approver comment is awaiting a reply",
  "qualification open": "an open qualification is blocking submission",
  "evidence added after submission": "evidence changed after submission",
  "unassigned role": "a required role is unassigned",
  "assai evidence": "Assai-sourced evidence needs confirmation",
  "no hemp register attached": "no HEMP register is attached",
};
function headlinePhraseFor(fact: Fact | undefined): string {
  if (!fact) return "signals need review";
  const raw = (fact.label || "").toLowerCase().trim();
  for (const key of Object.keys(HEADLINE_PHRASES)) {
    if (raw.includes(key)) return HEADLINE_PHRASES[key];
  }
  return raw || "signals need review";
}
function composeHeadline(facts: Fact[], severity: string): string {
  const top = facts.find((f) => f.tone === "red") || facts.find((f) => f.tone === "amber");
  if (severity === "red" && top) return `Blocker: ${headlinePhraseFor(top)}.`;
  if (severity === "amber" && top) return `Heads up: ${headlinePhraseFor(top)}.`;
  return "All checked signals look ready for review.";
}

// Deterministic per-label sentence templates. No LLM. Woven in severity order,
// max 3 sentences. Cat-A/ITR sentences MUST carry the "all scoped systems"
// caveat until Phase 2 Ex-scoping lands.
interface SummaryCtx {
  requirementText?: string;
  systemsInScope?: string;
  itrsValue?: string; // "X / Y"
}
function fmtNum(s: string): string {
  return s.replace(/\d{4,}/g, (m) => Number(m).toLocaleString("en-US"));
}
function sentenceForFact(f: Fact, ctx: SummaryCtx, allFacts: Fact[], consumed: Set<string>): string | null {
  const l = (f.label || "").toLowerCase();
  const v = fmtNum(f.value || "");
  // Generalised exclusion: any fact whose value is a bare percentage and whose
  // tone is amber SOLELY because it is <100 % is detail-tier — it belongs in
  // facts[]/Details, not in the prose summary. This covers "Avg completion %"
  // and any future percentage stat that lands with an amber tone.
  if (f.tone === "amber" && /^\s*\d{1,3}(\.\d+)?\s*%\s*$/.test(f.value || "")) return null;
  // Register-reader table-row schemas: friendly sentences using the schema
  // labels. Deterministic, no LLM.
  if (l === "units acknowledged") {
    const m = /^(\d+)\s+of\s+(\d+)$/.exec(v);
    if (m) {
      const ack = Number(m[1]), total = Number(m[2]);
      const outstandingFact = allFacts.find((x) => (x.label || "").toLowerCase() === "awaiting acknowledgement");
      if (ack < total) {
        const names = outstandingFact?.value || "";
        consumed.add("Awaiting acknowledgement");
        return names
          ? `The notification sheet shows ${ack} of ${total} units have acknowledged; ${names} are still outstanding.`
          : `The notification sheet shows ${ack} of ${total} units have acknowledged.`;
      }
      return `All ${total} affected units have acknowledged the start-up notification.`;
    }
  }

  if (l.includes("required evidence attached") && f.tone === "amber") {
    const req = ctx.requirementText && ctx.requirementText.trim()
      ? ctx.requirementText.trim()
      : "the required evidence";
    return `Nothing has been attached yet. This item needs ${req} before it can be submitted for review.`;
  }
  if (l.startsWith("evidence check")) {
    const file = f.label.replace(/^evidence check:\s*/i, "").trim() || "the attached file";
    const [verdictRaw, ...reasonParts] = v.split("—");
    const verdict = (verdictRaw || "").trim() || "unrelated";
    const reason = reasonParts.join("—").trim();
    return reason
      ? `The attached file '${file}' looks ${verdict} to the requirement — ${reason}.`
      : `The attached file '${file}' looks ${verdict} to the requirement.`;
  }
  if (l.includes("cat-a punch")) {
    const n = v;
    const systems = ctx.systemsInScope || "the";
    const itr = allFacts.find((x) => x.label === "ITRs complete (A+B)" && x.value && x.value !== "No data");
    let itrParen = "";
    if (itr) {
      itrParen = ` (with ${fmtNum(itr.value).replace(/\s*\/\s*/, " of ")} ITRs signed)`;
      consumed.add("ITRs complete (A+B)");
    }
    return `The scoped systems still carry ${n} open Cat-A punch items (across all ${systems} scoped systems — not specific to this item's topic)${itrParen}.`;
  }
  if (l.includes("itrs complete") && f.tone === "amber") {
    const systems = ctx.systemsInScope || "the";
    return `Only ${v.replace(/\s*\/\s*/, " of ")} ITRs are signed across all ${systems} scoped systems (not specific to this item's topic).`;
  }
  if (l.includes("returned by approver")) return "The approver returned this item — address the return reason before resubmitting.";
  if (l.includes("approver comment awaiting reply")) return "An approver comment is awaiting a reply.";
  if (l.includes("qualification open")) return "An open qualification is blocking submission.";
  if (l.includes("unassigned role")) return `A required role (${v}) is unassigned.`;
  if (l.includes("evidence added after submission")) return `Evidence changed after submission (${v}) — a fresh review is needed.`;
  if (l.includes("assai")) return "Assai-sourced evidence needs confirmation.";
  if (l.includes("outdated revision") || v.toLowerCase().includes("outdated revision")) {
    return "An attached document is on an outdated revision.";
  }
  return `${f.label}: ${v}.`;
}
function composeSummary(facts: Fact[], severity: string, ctx: SummaryCtx): string {
  if (severity === "green") return "All checked signals look ready for review.";
  const actionable = [
    ...facts.filter((f) => f.tone === "red"),
    ...facts.filter((f) => f.tone === "amber"),
  ];
  // Cat-A folds ITR into its parenthetical — process Cat-A before ITR so the
  // standalone ITR sentence is suppressed when both fire.
  actionable.sort((a, b) => {
    const ac = (a.label || "").toLowerCase().includes("cat-a punch") ? 0 : 1;
    const bc = (b.label || "").toLowerCase().includes("cat-a punch") ? 0 : 1;
    return ac - bc;
  });
  const consumed = new Set<string>();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of actionable) {
    if (consumed.has(f.label)) continue;
    const s = sentenceForFact(f, ctx, facts, consumed);
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= 3) break;
  }
  if (out.length === 0) return composeHeadline(facts, severity);
  return out.join(" ");
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

    // Resolve item + category + display_order (for Ivan's DI-03 gating)
    const { data: itemRow } = await bounded("item lookup", DB_TIMEOUT_MS, { data: null }, (signal) =>
      withAbort(
        sb
          .from("vcr_items")
          .select("id, supporting_evidence, display_order, category:vcr_item_categories(code, name)")
          .eq("id", vcr_item_id)
          .maybeSingle(),
        signal,
      ),
    );
    // VCR item record from prereq side has prerequisite_id; look it up
    const { data: prereq } = await bounded("prereq lookup", DB_TIMEOUT_MS, { data: null }, (signal) =>
      withAbort(
        sb
          .from("p2a_vcr_prerequisites")
          .select("id, status, reviewed_at, updated_at")
          .eq("handover_point_id", vcr_id)
          .eq("vcr_item_id", vcr_item_id)
          .maybeSingle(),
        signal,
      ),
    );
    const categoryCode = (itemRow as any)?.category?.code || "??";

    // Resolve project_id via handover point → handover plan (same chain the RLS helpers use).
    // Needed by workflowSignalsEngine signal #5 (unassigned role) which calls
    // resolve_project_role_user(project_id, role_name).
    const { data: hpRow } = await bounded("handover point lookup", DB_TIMEOUT_MS, { data: null }, (signal) =>
      withAbort(
        sb
          .from("p2a_handover_points")
          .select("handover_plan_id")
          .eq("id", vcr_id)
          .maybeSingle(),
        signal,
      ),
    );
    let projectId: string | null = null;
    if ((hpRow as any)?.handover_plan_id) {
      const { data: planRow } = await bounded("handover plan lookup", DB_TIMEOUT_MS, { data: null }, (signal) =>
        withAbort(
          sb
            .from("p2a_handover_plans")
            .select("project_id")
            .eq("id", (hpRow as any).handover_plan_id)
            .maybeSingle(),
          signal,
        ),
      );
      projectId = (planRow as any)?.project_id || null;
    }

    const item = {
      ...(itemRow || {}),
      prerequisite_id: prereq?.id || null,
      handover_point_id: vcr_id,
      project_id: projectId,
      category_code: categoryCode,
      display_order: (itemRow as any)?.display_order ?? null,
    };
    const prereqStatus = prereq?.status || null;

    // Routing
    const { data: cfg } = await bounded("agent config", DB_TIMEOUT_MS, { data: null }, (signal) =>
      withAbort(
        sb
          .from("vcr_insights_agent_config")
          .select("lead_agent, contrib_agents, config_version")
          .eq("category_code", categoryCode)
          .maybeSingle(),
        signal,
      ),
    );
    const lead = cfg?.lead_agent || "selma";
    const contribs = (cfg?.contrib_agents || []) as string[];
    const configVersion = cfg?.config_version || 0;

    // Phase 1 template lookup (item-level routing). Must precede hashInput so
    // template edits invalidate the cache.
    const { data: template } = await bounded("template lookup", DB_TIMEOUT_MS, { data: null }, (signal) =>
      withAbort(
        sb
          .from("vcr_item_insight_templates")
          .select("engines, action_templates, config_version")
          .eq("vcr_item_id", vcr_item_id)
          .maybeSingle(),
        signal,
      ),
    );
    const templateEngines: string[] = Array.isArray((template as any)?.engines) && (template as any).engines.length > 0
      ? (template as any).engines
      : ["evidence_match", "workflow_signals", "currency_check"];
    const templateVersion = (template as any)?.config_version || 0;
    const actionTemplates = ((template as any)?.action_templates || {}) as Record<string, string>;

    // Evidence fingerprint — invalidate when files are added/removed/updated
    // Reads from p2a_vcr_evidence (the same store the UI writes to).
    const { data: evRows } = await bounded("evidence fingerprint", DB_TIMEOUT_MS, { data: [] }, (signal) =>
      withAbort(
        sb
          .from("p2a_vcr_evidence")
          .select("id, created_at")
          .eq("vcr_prerequisite_id", prereq?.id || "00000000-0000-0000-0000-000000000000")
          .order("id", { ascending: true }),
        signal,
      ),
    );
    const evidenceFingerprint = (evRows || []).map((r: any) => `${r.id}:${r.created_at}`).join("|");

    // Cache lookup — include prereq status so any status change invalidates
    const hashInput = JSON.stringify({
      configVersion,
      templateVersion,
      templateEngines,
      vcr_id,
      vcr_item_id,
      categoryCode,
      day: new Date().toISOString().slice(0, 10),
      evidenceFingerprint,
      prereqStatus,
    });

    const inputsHash = await sha(hashInput);
    if (!force) {
      const { data: cached } = await bounded("cache lookup", DB_TIMEOUT_MS, { data: null }, (signal) =>
        withAbort(
          sb
            .from("vcr_item_insights")
            .select("payload, inputs_hash, origin, computed_at")
            .eq("vcr_id", vcr_id)
            .eq("vcr_item_id", vcr_item_id)
            .maybeSingle(),
          signal,
        ),
      );
      if (cached?.inputs_hash === inputsHash) {
        const merged = {
          ...(cached.payload as Record<string, unknown>),
          origin: (cached as { origin?: string }).origin ?? 'computed',
          computed_at: (cached as { computed_at?: string }).computed_at ?? null,
        };
        return new Response(JSON.stringify({ insights: merged, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const allFacts: Fact[] = [];
    // Alias engine names to a single identity so runOnce truly dedupes.
    // 'selma' (contrib in vcr_insights_agent_config) and 'currency_check'
    // (template engine) both invoke selmaRevisionPass — collapse to one id.
    // 'ivan' is now a legacy alias for register_reader:hemp_di03.
    const canonicalEngine = (name: string): string => {
      if (name === "selma") return "currency_check";
      if (name === "ivan") return "register_reader:hemp_di03";
      return name;
    };
    const runAgent = async (name: string) => {
      try {
        if (name === "fred") allFacts.push(...(await fredCompletionsAggregator(sb, vcr_id)));
        else if (name.startsWith("register_reader:")) {
          const schemaKey = name.slice("register_reader:".length);
          allFacts.push(...(await registerReaderEngine(sb, item, lovableKey, schemaKey)));
        }
        else if (name === "evidence_match") allFacts.push(...(await evidenceMatchEngine(sb, item, lovableKey)));
        else if (name === "workflow_signals") allFacts.push(...(await workflowSignalsEngine(sb, item, prereq)));
        else if (name === "currency_check") allFacts.push(...(await selmaRevisionPass(sb, item)));
        // hannah / alex: silent no-op stubs until real agents land.
        else if (name === "hannah" || name === "alex") { /* no-op */ }
      } catch (e) {
        allFacts.push({ label: `${name} agent`, value: `Error: ${(e as Error).message}`, confidence: "unavailable" });
      }
    };


    const ranSet = new Set<string>();
    const runOnce = async (name: string) => {
      const canon = canonicalEngine(name);
      if (ranSet.has(canon)) return;
      ranSet.add(canon);
      await runAgent(canon);
    };
    for (const eng of templateEngines) await runOnce(eng);
    // Category-level config is ADDITIVE (fred/ivan/selma) — do not remove.
    if (cfg?.lead_agent) await runOnce(cfg.lead_agent);
    for (const c of contribs) await runOnce(c);

    // Noise suppression at compose time.
    // - Drop neutral "Status" fact (duplicates header chip, no signal).
    // - Drop "Not tracked in DMS" facts (honest-gap marker, not actionable).
    // - Drop facts with confidence 'unavailable' UNLESS they carry an
    //   actionable tone (amber/red) — those are real gaps.
    const renderedFacts = allFacts.filter((f) => {
      if (f.label === "Status" && (!f.tone || f.tone === "neutral")) return false;
      if (typeof f.value === "string" && f.value === "Not tracked in DMS") return false;
      if (f.confidence === "unavailable" && (!f.tone || f.tone === "neutral")) return false;
      return true;
    });

    const usable = allFacts.filter((f) => f.confidence !== "unavailable");
    // Terminal items: quiet retrospective, no nag. Facts stay for audit but
    // their tone is downgraded to neutral so severity reads green.
    const TERMINAL_STATUSES = new Set(["ACCEPTED", "QUALIFICATION_APPROVED", "REJECTED"]);
    const isTerminal = !!prereqStatus && TERMINAL_STATUSES.has(prereqStatus);
    const insights: Insights = usable.length === 0
      ? { state: "unavailable", facts: renderedFacts }
      : (() => {
          if (isTerminal) {
            const neutralFacts = renderedFacts.map((f) => ({ ...f, tone: "neutral" as Tone }));
            const reviewedAtRaw = (prereq as any)?.reviewed_at || (prereq as any)?.updated_at || null;
            const dateLabel = reviewedAtRaw
              ? new Date(reviewedAtRaw).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
              : null;
            const verb = prereqStatus === "ACCEPTED" ? "Accepted"
              : prereqStatus === "QUALIFICATION_APPROVED" ? "Qualified"
              : "Rejected";
            const readinessLabel = verb;
            const hadGap = renderedFacts.some((f) =>
              (f.label || "").toLowerCase().includes("required evidence attached") ||
              (f.label || "").toLowerCase().includes("required documents attached"),
            );
            const summaryParts = [dateLabel ? `${verb} on ${dateLabel}.` : `${verb}.`];
            if (hadGap) summaryParts.push("No evidence was attached.");
            return {
              state: "ready",
              severity: "green",
              headline: `${verb}.`,
              summary: summaryParts.join(" "),
              next_step: null,
              facts: neutralFacts,
              readiness_label: readinessLabel,
              terminal: true,
            };
          }

          const severity = composeSeverity(renderedFacts);
          const topFact = renderedFacts.find((f) => f.tone === "red") || renderedFacts.find((f) => f.tone === "amber");
          const deliverKey = topFact?.label || "";
          const approverKey = topFact?.label || "";
          const defaultDeliver = severity === "green"
            ? "Looks ready — review evidence before marking complete."
            : nextStepForFact(topFact, renderedFacts) ?? "Resolve flagged signals before submitting.";
          const defaultApprover = severity === "green"
            ? "Live signals look ready."
            : "Heads up before accepting — confirm flagged signals.";

          const summaryCtx: SummaryCtx = {
            requirementText: parseEvidenceLabels((itemRow as any)?.supporting_evidence).join(", "),
            systemsInScope: renderedFacts.find((f) => f.label === "Systems in scope")?.value,
            itrsValue: renderedFacts.find((f) => f.label === "ITRs complete (A+B)")?.value,
          };
          const summary = composeSummary(renderedFacts, severity, summaryCtx);
          const nextStep = severity === "green" ? null : nextStepForFact(topFact, renderedFacts);

          return {
            state: "ready",
            severity,
            headline: composeHeadline(renderedFacts, severity),
            summary,
            next_step: nextStep,
            facts: renderedFacts,
            delivering_action: actionTemplates[`delivering:${deliverKey}`] || defaultDeliver,
            approver_check: actionTemplates[`approver:${approverKey}`] || defaultApprover,
          };
        })();

    const nowIso = new Date().toISOString();
    await bounded("cache upsert", DB_TIMEOUT_MS, null, (signal) =>

      withAbort(
        sb.from("vcr_item_insights").upsert({
          vcr_id, vcr_item_id, payload: insights, inputs_hash: inputsHash,
          state: insights.state, severity: insights.severity ?? null, computed_at: nowIso,
          origin: 'computed',
        }, { onConflict: "vcr_id,vcr_item_id" }),
        signal,
      ),
    );

    return new Response(JSON.stringify({ insights: { ...insights, origin: 'computed', computed_at: nowIso }, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
