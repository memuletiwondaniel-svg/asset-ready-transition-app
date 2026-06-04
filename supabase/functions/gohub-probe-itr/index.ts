/**
 * Combined probe v3 — applies live-capture fix:
 *   - TagSearch / PunchlistItemSearch / HandoverSearch fire via Telerik
 *     RadButton. Postback target is the RadButton control UniqueID WITHOUT
 *     the trailing `_input` (which is the inner <input> name, not the
 *     server-side button id). Posting `_input` is treated as a plain
 *     reload → empty grid.
 *   - GocSessionManager already selects the project tile in ensureSession,
 *     so project context is established before navigateTo().
 *
 * Verifies §3 row contract for TagSearch:
 *   columns ID | Tag | Description | Sub System | Module | Discipline |
 *           Attachments | Tag ITRs
 *   - ID         = stable tag GUID (also in ShowDetailsID('<guid>'))
 *   - Tag ITRs   = comma-separated ITR codes; <b>code</b> = outstanding
 *   - ab_phase   = last char of code (A/B)
 *   - discipline = letter after `BGC-` (I/P/M/E/Q/C)
 *   - instance key = (project_code, subsystem, tag_guid, itr_code)
 *
 * Also probes Punch + DAC with the same `_input`-stripped postback.
 */

import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import {
  GocSessionManager,
  getGoCompletionsCredentials,
  postWithViewState,
  parseRadGridTable,
} from "../_shared/gocompletions-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Discover RadButton postback target on a search page.
 *  Strategy: find an <input ... name="...$SearchButton_input"> and return
 *  the UniqueID with `_input` stripped. Falls back to scanning RadButton
 *  client init for SearchButton id.
 */
function findSearchPostbackTarget(html: string): { target: string | null; rawInputName: string | null } {
  const inputRe = /<input[^>]*name=["']([^"']+SearchButton)_input["']/i;
  const m = html.match(inputRe);
  if (m) return { target: m[1], rawInputName: m[1] + "_input" };
  // fallback: client-side RadButton init mentions ClientID
  const cidRe = /id="([^"]+SearchButton)"[^>]*class="[^"]*RadButton/i;
  const c = html.match(cidRe);
  if (c) {
    // convert ClientID (underscores) to UniqueID (dollar signs) — heuristic
    const uid = c[1].replace(/^ctl00_/, "ctl00$").replace(/_/g, "$");
    return { target: uid, rawInputName: null };
  }
  return { target: null, rawInputName: null };
}

/** Find the field name on this page that takes the subsystem filter.
 *  Telerik combo: input name endsWith `$SubSystem`. We also need the
 *  corresponding ClientState hidden when the combo is populated by JS,
 *  but for a free-text search the visible input is enough.
 */
function findSubSystemField(html: string): { field: string | null; clientStateField: string | null; candidates: string[] } {
  const candidates: string[] = [];
  const re = /<input[^>]*name=["']([^"']*[Ss]ub[Ss]ystem[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) candidates.push(m[1]);
  // RadComboBox: visible typed value is `..._Input`, hidden state is `..._ClientState`
  const inputField = candidates.find((c) => /SubSystem_Input$/i.test(c))
    || candidates.find((c) => /\$SubSystem$/.test(c))
    || candidates.find((c) => /PrimarySearchCriteria[^_]*SubSystem/i.test(c))
    || null;
  const clientStateField = candidates.find((c) => /SubSystem_ClientState$/i.test(c)) || null;
  return { field: inputField, clientStateField, candidates };
}

/** Parse the "Tag ITRs" cell HTML to extract per-ITR open/closed.
 *  Cell example: `BGC-I01A, <b>BGC-I02A</b>, BGC-I20B`
 *  Returns [{ code, outstanding }]
 */
function parseTagItrsCell(cellHtml: string): Array<{ code: string; outstanding: boolean }> {
  const out: Array<{ code: string; outstanding: boolean }> = [];
  // Split on commas at the top level (not inside tags)
  const parts = cellHtml.split(/,(?![^<]*>)/);
  for (const raw of parts) {
    const s = raw.trim();
    if (!s) continue;
    const isBold = /<b\b[^>]*>/i.test(s);
    const code = s.replace(/<[^>]+>/g, "").trim();
    if (code) out.push({ code, outstanding: isBold });
  }
  return out;
}

/** Extract per-row cells, preserving inner HTML (needed for <b> detection). */
function extractRowCellsHtml(tableHtml: string): string[][] {
  const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const body = tbodyMatch ? tbodyMatch[1] : tableHtml;
  const trRe = /<tr[^>]*class="[^"]*rg(?:Row|AltRow)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[][] = [];
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(body)) !== null) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let t: RegExpExecArray | null;
    while ((t = tdRe.exec(m[1])) !== null) cells.push(t[1]);
    if (cells.length) rows.push(cells);
  }
  return rows;
}

/** Extract headers in order. */
function extractHeaders(tableHtml: string): string[] {
  const headerRowMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)
    || tableHtml.match(/<tr[^>]*class="[^"]*rgHeader[^"]*"[^>]*>([\s\S]*?)<\/tr>/i);
  if (!headerRowMatch) return [];
  const headers: string[] = [];
  const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  let m;
  while ((m = thRe.exec(headerRowMatch[1])) !== null) {
    headers.push(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  }
  return headers;
}

async function runTagSearch(
  session: GocSessionManager,
  subsystemNumber: string,
) {
  const probe: any = {
    subsystem: subsystemNumber,
    page_loaded: false,
    postback_target: null,
    subsystem_field: null,
    result_rows: 0,
    headers: [],
    parsed_itr_instances: 0,
    a_count: 0,
    b_count: 0,
    outstanding_count: 0,
    complete_count: 0,
    discipline_breakdown: {},
    sample_rows: [] as any[],
    error: null as string | null,
  };
  try {
    const { html, url, cookies } = await session.navigateTo("GoCompletions/Completions/TagSearch.aspx");
    probe.page_loaded = true;
    const { target, rawInputName } = findSearchPostbackTarget(html);
    probe.postback_target = target;
    probe.search_button_input_name = rawInputName;
    const sub = findSubSystemField(html);
    probe.subsystem_field = sub.field;
    probe.subsystem_field_candidates = sub.candidates;
    probe.subsystem_clientstate_field = sub.clientStateField;
    if (!target || !sub.field) {
      probe.error = "could not discover postback target or subsystem field";
      return probe;
    }

    const params: Record<string, string> = {
      [sub.field]: subsystemNumber,
      __EVENTTARGET: target,
      __EVENTARGUMENT: "",
    };
    if (sub.clientStateField) {
      params[sub.clientStateField] = JSON.stringify({
        logEntries: null, value: subsystemNumber, text: subsystemNumber,
        enabled: true, checkedIndices: [], checkedItemsTextOverflows: false,
      });
    }
    const { html: resultHtml } = await postWithViewState(cookies, url, html, params);

    const tableMatch = resultHtml.match(/<table[^>]*class="[^"]*rgMasterTable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) {
      probe.error = "no rgMasterTable in result";
      return probe;
    }
    const tableHtml = tableMatch[1];
    const headers = extractHeaders(tableHtml);
    probe.headers = headers;
    const rows = extractRowCellsHtml(tableHtml);
    probe.result_rows = rows.length;

    const tagItrsIdx = headers.findIndex((h) => /tag\s*itrs/i.test(h));
    const idIdx = headers.findIndex((h) => /^id$/i.test(h));
    const tagIdx = headers.findIndex((h) => /^tag$/i.test(h));
    const discIdx = headers.findIndex((h) => /discipline/i.test(h));

    const sampleOut: any[] = [];
    for (const r of rows) {
      const idCell = idIdx >= 0 ? r[idIdx] : "";
      const tagCell = tagIdx >= 0 ? r[tagIdx] : "";
      const discCell = discIdx >= 0 ? r[discIdx] : "";
      const itrsCell = tagItrsIdx >= 0 ? r[tagItrsIdx] : "";
      const guidMatch = idCell.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const tag_guid = guidMatch ? guidMatch[0] : idCell.replace(/<[^>]+>/g, "").trim();
      const tag = tagCell.replace(/<[^>]+>/g, "").trim();
      const discipline_col = discCell.replace(/<[^>]+>/g, "").trim();
      const itrs = parseTagItrsCell(itrsCell);
      for (const itr of itrs) {
        probe.parsed_itr_instances++;
        const ab = itr.code.match(/([AB])\s*$/i)?.[1]?.toUpperCase() ?? "?";
        if (ab === "A") probe.a_count++;
        else if (ab === "B") probe.b_count++;
        if (itr.outstanding) probe.outstanding_count++; else probe.complete_count++;
        const disc = itr.code.match(/BGC-([A-Z])/)?.[1] ?? discipline_col?.[0] ?? "?";
        probe.discipline_breakdown[disc] = (probe.discipline_breakdown[disc] || 0) + 1;
      }
      if (sampleOut.length < 3) {
        sampleOut.push({ tag_guid, tag, discipline: discipline_col, itrs });
      }
    }
    probe.sample_rows = sampleOut;
    return probe;
  } catch (e: any) {
    probe.error = String(e?.message || e).slice(0, 300);
    return probe;
  }
}

async function runPunch(session: GocSessionManager, subsystemNumber: string) {
  const probe: any = { rows: 0, headers: [], sample: [], per_punchlist_groups: [], error: null };
  try {
    const { html, url, cookies } = await session.navigateTo("GoCompletions/Completions/PunchlistItemSearch.aspx");
    const { target } = findSearchPostbackTarget(html);
    const sub = findSubSystemField(html);
    probe.postback_target = target;
    probe.subsystem_field = sub.field;
    probe.subsystem_field_candidates = sub.candidates;
    if (!target || !sub.field) { probe.error = "no target/subField"; return probe; }
    const params: Record<string, string> = {
      [sub.field]: subsystemNumber,
      __EVENTTARGET: target,
      __EVENTARGUMENT: "",
    };
    if (sub.clientStateField) {
      params[sub.clientStateField] = JSON.stringify({ value: subsystemNumber, text: subsystemNumber, enabled: true });
    }
    const { html: resultHtml } = await postWithViewState(cookies, url, html, params);
    const rows = parseRadGridTable(resultHtml);
    probe.rows = rows.length;
    probe.headers = rows[0] ? Object.keys(rows[0]) : [];
    probe.sample = rows.slice(0, 5);
    const groups: Record<string, number[]> = {};
    for (const r of rows.slice(0, 1000)) {
      const pl = String(r.Punchlist || r["Punch List"] || r.PunchList || "");
      const itemNo = Number(r.Item || r["Item No"] || r.ItemNo || NaN);
      if (!pl || !Number.isFinite(itemNo)) continue;
      (groups[pl] ||= []).push(itemNo);
    }
    probe.per_punchlist_groups = Object.entries(groups).slice(0, 8)
      .map(([p, ns]) => ({ punchlist: p, item_nos: ns.sort((a, b) => a - b).slice(0, 12) }));
    probe.per_punchlist_confirmed = probe.per_punchlist_groups.filter((g: any) => g.item_nos.includes(1)).length >= 2;
  } catch (e: any) { probe.error = String(e?.message || e).slice(0, 300); }
  return probe;
}

async function runDac(session: GocSessionManager, subsystemNumber: string) {
  const probe: any = { rows: 0, headers: [], sample: [], discipline_fanout: [], error: null };
  try {
    const path = "GoCompletions/Handovers/HandoverSearch.aspx?HandoverGate=1&GroupBy=SubSystem,Discipline";
    const { html, url, cookies } = await session.navigateTo(path);
    const { target } = findSearchPostbackTarget(html);
    const subField = findSubSystemField(html);
    probe.postback_target = target;
    probe.subsystem_field = subField;
    const params: Record<string, string> = { __EVENTTARGET: target || "", __EVENTARGUMENT: "" };
    if (subField) params[subField] = subsystemNumber;
    const { html: resultHtml } = target
      ? await postWithViewState(cookies, url, html, params)
      : { html };
    const rows = parseRadGridTable(resultHtml);
    probe.rows = rows.length;
    probe.headers = rows[0] ? Object.keys(rows[0]) : [];
    probe.sample = rows.slice(0, 5);
    const byss: Record<string, Set<string>> = {};
    for (const r of rows.slice(0, 1000)) {
      const ss = String(r["Sub System"] || r.SubSystem || "");
      const disc = String(r.Discipline || "");
      if (!ss) continue;
      (byss[ss] ||= new Set()).add(disc);
    }
    probe.discipline_fanout = Object.entries(byss).slice(0, 8)
      .map(([ss, d]) => ({ subsystem: ss, disciplines: Array.from(d) }));
    probe.per_discipline_confirmed = Object.values(byss).some((s) => s.size > 1);
  } catch (e: any) { probe.error = String(e?.message || e).slice(0, 300); }
  return probe;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const report: any = { inputs: {}, tagsearch: [], punch: null, dac: null, errors: [] };

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const projectCode: string = body.project_code || "WEST QURNA";
    const subsystems: string[] = body.subsystems || ["C013-DP18A-08X"]; // pass DP-18F subs to verify 26-vs-33
    report.inputs = { projectCode, subsystems };

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const creds = await getGoCompletionsCredentials(supa);
    const session = new GocSessionManager(creds.portalUrl, creds.username, creds.password, projectCode);

    for (const ss of subsystems) {
      report.tagsearch.push(await runTagSearch(session, ss));
    }
    report.punch = await runPunch(session, subsystems[0]);
    report.dac = await runDac(session, subsystems[0]);

    return json(report);
  } catch (e: any) {
    report.errors.push("fatal: " + String(e?.message || e));
    return json(report, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
