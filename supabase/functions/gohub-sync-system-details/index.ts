/**
 * gohub-sync-system-details
 *
 * Per-project sync into the three detail tables (gohub_itr_items,
 * gohub_punch_items, gohub_certificates) + rollup snapshot on
 * p2a_systems (gohub_rollup_total_itrs/complete_itrs/synced_at).
 *
 * Uses the live-capture fix: Search-button RadButton postback target is
 * the control UniqueID WITHOUT the trailing `_input` (which is the inner
 * <input> name, not the server-side click target). GocSessionManager
 * already selects the project tile before any page navigation.
 *
 * Body:
 *   {
 *     project_code: string,             // e.g. "DP-18F"
 *     tile_name?:   string,             // GoC tile (e.g. "WEST QURNA"); auto-resolved if absent
 *     system_ids?:  string[],           // optional limit; default = all p2a_systems for the project
 *     skip_certs?:  boolean,            // skip the Fred handover pass (debug)
 *     dry_run?:     boolean,            // parse + report, do not upsert
 *   }
 */

import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import {
  GocSessionManager,
  getGoCompletionsCredentials,
  postWithViewState,
  parseRadGridTable,
  resolveAsmxServiceUrl,
  formatCookies,
  BROWSER_UA,
} from "../_shared/gocompletions-auth.ts";
import { handleGetHandoverCertificateStatus } from "../_shared/fred/handlers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Page-shape discovery helpers ───────────────────────────
//
// Live-capture findings (TagSearch.aspx):
//   - SubSystem filter is a plain textbox:
//       ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i0
//         $TagSearch_PrimarySearchCriteria$SubSystemTextBox
//     There is NO RadComboBox _ClientState on the SubSystem field.
//   - SearchButton is a RadButton:
//       ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i7$SearchButton
//     The page renders an inner <input name="..._input">; the postback
//     target is the OUTER UniqueID (strip the trailing "_input").
//
// To avoid grabbing controls from an unrelated pane (header search,
// alerts, other panels), prefer the PrimarySearchCriteria-scoped
// SubSystem control, then derive the SearchButton from the same
// MasterRadPanelBar$i0$iN parent path when possible.

function findSubSystemField(html: string): {
  field: string | null;
  clientState: string | null;
  scopePrefix: string | null;
} {
  const cands: string[] = [];
  const re = /<input[^>]*name=["']([^"']*[Ss]ub[Ss]ystem[^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) cands.push(m[1]);

  // Prefer controls inside *PrimarySearchCriteria — that's the real search
  // form for TagSearch/PunchlistItemSearch/HandoverSearch. Inside that
  // scope, prefer the plain textbox (SubSystemTextBox); fall back to a
  // RadComboBox visible input ($SubSystem_Input) only if no textbox.
  const primary = cands.filter((c) => /PrimarySearchCriteria/i.test(c));
  const pool = primary.length ? primary : cands;
  const field = pool.find((c) => /SubSystemTextBox$/i.test(c))
    || pool.find((c) => /\$SubSystem$/.test(c))
    || pool.find((c) => /SubSystem_Input$/i.test(c))
    || null;

  // ClientState only exists when the control is a RadComboBox. For the
  // TagSearch plain textbox it will (correctly) be null.
  const clientState = pool.find((c) => /SubSystem_ClientState$/i.test(c)) || null;

  // Scope prefix = the MasterRadPanelBar$i0$iN parent of the chosen field.
  let scopePrefix: string | null = null;
  if (field) {
    const sm = field.match(/^(.*?MasterRadPanelBar\$i\d+)\$i\d+/i);
    if (sm) scopePrefix = sm[1];
  }
  return { field, clientState, scopePrefix };
}

function findPostbackTarget(html: string, scopePrefix: string | null): string | null {
  // Strip "_input" → UniqueID for the RadButton outer name.
  const targets: string[] = [];
  const re = /<input[^>]*name=["']([^"']+SearchButton)_input["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) targets.push(m[1]);
  if (!targets.length) return null;
  if (scopePrefix) {
    const scoped = targets.find((t) => t.startsWith(scopePrefix));
    if (scoped) return scoped;
  }
  return targets[0];
}

function extractRowCellsHtml(tableHtml: string): string[][] {
  const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const body = tbodyMatch ? tbodyMatch[1] : tableHtml;
  const trRe = /<tr[^>]*class="[^"]*rg(?:Row|AltRow)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[][] = [];
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(body)) !== null) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const cells: string[] = [];
    let t: RegExpExecArray | null;
    while ((t = tdRe.exec(m[1])) !== null) cells.push(t[1]);
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function extractHeaders(tableHtml: string): string[] {
  const head = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)
    || tableHtml.match(/<tr[^>]*class="[^"]*rgHeader[^"]*"[^>]*>([\s\S]*?)<\/tr>/i);
  if (!head) return [];
  const out: string[] = [];
  const re = /<th[^>]*>([\s\S]*?)<\/th>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(head[1])) !== null) {
    out.push(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  }
  return out;
}

function parseTagItrsCell(cellHtml: string): Array<{ code: string; outstanding: boolean }> {
  const out: Array<{ code: string; outstanding: boolean }> = [];
  for (const raw of cellHtml.split(/,(?![^<]*>)/)) {
    const s = raw.trim();
    if (!s) continue;
    const outstanding = /<b\b[^>]*>/i.test(s);
    const code = s.replace(/<[^>]+>/g, "").trim();
    if (code) out.push({ code, outstanding });
  }
  return out;
}

function parseDmyDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const clean = String(s).replace(/&nbsp;/g, "").trim();
  if (!clean) return null;
  // "17 Sep 2019"
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const m = clean.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (m) {
    const mm = months[m[2].toLowerCase()];
    if (mm) return `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
  }
  // ISO already?
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
  return null;
}

function htmlCellText(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").replace(/\s+/g, " ").trim();
}

// ─── Per-subsystem scrapers ──────────────────────────────────

async function scrapeTagSearch(session: GocSessionManager, subsystem: string, debug = false) {
  const { html, url, cookies } = await session.navigateTo("GoCompletions/Completions/TagSearch.aspx");
  const sub = findSubSystemField(html);
  const target = findPostbackTarget(html, sub.scopePrefix);
  const dbg: any = debug ? { subsystem_field: sub.field, postback_target: target, tagsearch_html_excerpt: null } : null;
  if (!target || !sub.field) {
    return { ok: false, reason: "no postback target or subsystem field", items: [] as any[], debug: dbg };
  }
  // SubSystem on TagSearch is a plain textbox → post plain text only.
  // Only write ClientState if the page actually has one (RadComboBox).
  const params: Record<string, string> = {
    [sub.field]: subsystem,
    __EVENTTARGET: target,
    __EVENTARGUMENT: "",
  };
  if (sub.clientState) {
    params[sub.clientState] = JSON.stringify({
      value: subsystem, text: subsystem, enabled: true, logEntries: null,
      checkedIndices: [], checkedItemsTextOverflows: false,
    });
  }
  // postWithViewState reuses __VIEWSTATE / __VIEWSTATEGENERATOR /
  // __EVENTVALIDATION extracted from THIS GET — required for the
  // SearchButton click to bind server-side.
  const { html: resultHtml } = await postWithViewState(cookies, url, html, params);
  if (dbg) dbg.tagsearch_html_excerpt = resultHtml.slice(0, 2048);
  const tableMatch = resultHtml.match(/<table[^>]*class="[^"]*rgMasterTable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return { ok: false, reason: "no rgMasterTable", items: [] as any[], debug: dbg };

  const headers = extractHeaders(tableMatch[1]);
  const rows = extractRowCellsHtml(tableMatch[1]);
  const idIdx = headers.findIndex((h) => /^id$/i.test(h));
  const tagIdx = headers.findIndex((h) => /^tag$/i.test(h));
  const descIdx = headers.findIndex((h) => /^description$/i.test(h));
  const discIdx = headers.findIndex((h) => /^discipline$/i.test(h));
  const itrsIdx = headers.findIndex((h) => /tag\s*itrs/i.test(h));
  if (itrsIdx < 0) return { ok: false, reason: "no Tag ITRs column", items: [] as any[], debug: dbg };

  const items: any[] = [];
  for (const r of rows) {
    const tagGuid = idIdx >= 0
      ? (r[idIdx].match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || htmlCellText(r[idIdx]))
      : "";
    const tagCode = tagIdx >= 0 ? htmlCellText(r[tagIdx]) : "";
    const tagDesc = descIdx >= 0 ? htmlCellText(r[descIdx]) : "";
    const discColumn = discIdx >= 0 ? htmlCellText(r[discIdx]) : "";
    const itrs = parseTagItrsCell(r[itrsIdx]);
    for (const itr of itrs) {
      const ab = itr.code.match(/([AB])\s*$/i)?.[1]?.toUpperCase() ?? "?";
      const disc = itr.code.match(/BGC-([A-Z])/)?.[1] ?? (discColumn[0] || "");
      items.push({
        tag_guid: tagGuid,
        tag_code: tagCode,
        tag_description: tagDesc,
        itr_code: itr.code,
        ab_phase: ab === "A" || ab === "B" ? ab : "?",
        discipline: disc,
        status: itr.outstanding ? "open" : "complete",
        raw: { tag_id_cell: r[idIdx], discipline_cell: discColumn },
      });
    }
  }
  return { ok: true, items, header_count: headers.length, row_count: rows.length, debug: dbg };
}

async function scrapePunch(session: GocSessionManager, subsystem: string) {
  const { html, url, cookies } = await session.navigateTo("GoCompletions/Completions/PunchlistItemSearch.aspx");
  const sub = findSubSystemField(html);
  const target = findPostbackTarget(html, sub.scopePrefix);
  if (!target || !sub.field) return { ok: false, reason: "no postback target or subsystem field", items: [] as any[] };
  const params: Record<string, string> = {
    [sub.field]: subsystem,
    __EVENTTARGET: target,
    __EVENTARGUMENT: "",
  };
  if (sub.clientState) {
    params[sub.clientState] = JSON.stringify({ value: subsystem, text: subsystem, enabled: true });
  }
  const { html: resultHtml } = await postWithViewState(cookies, url, html, params);
  const rows = parseRadGridTable(resultHtml);
  const items: any[] = [];
  for (const r of rows) {
    const pl = String(r.Punchlist || r["Punch List"] || r.PunchList || "").replace(/&nbsp;/g, "").trim();
    const itemNo = Number(String(r.Item || r["Item No"] || r.ItemNo || "").replace(/&nbsp;/g, "").trim());
    if (!pl || !Number.isFinite(itemNo)) continue;
    items.push({
      punchlist: pl,
      item_no: itemNo,
      description: String(r.Description || "").replace(/&nbsp;/g, "").trim(),
      discipline: String(r.Discipline || "").replace(/&nbsp;/g, "").trim(),
      category: String(r.Category || "").replace(/&nbsp;/g, "").trim(),
      tag: String(r.Tag || "").replace(/&nbsp;/g, "").trim(),
      itr: String(r.ITR || "").replace(/&nbsp;/g, "").trim(),
      location: String(r.Location || "").replace(/&nbsp;/g, "").trim(),
      cleared_date: parseDmyDate(r["Cleared Date"]),
      accepted_date: parseDmyDate(r["Accepted Date"]),
      accepted_by: String(r["Accepted By"] || "").replace(/&nbsp;/g, "").trim() || null,
      raw: r,
    });
  }
  return { ok: true, items, row_count: rows.length };
}

// ─── Main ──────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const report: any = {
    project_code: null, tile_name: null,
    subsystems_attempted: 0, subsystems_ok: 0,
    itr_items_upserted: 0, punch_items_upserted: 0, certs_upserted: 0,
    per_subsystem: [] as any[],
    cert_pass: { attempted: 0, ok: 0, errors: [] as string[] },
    rollup_updated: 0,
    errors: [] as string[],
  };

  try {
    const body = await req.json().catch(() => ({}));
    const projectCode: string = body.project_code;
    if (!projectCode) {
      return new Response(JSON.stringify({ error: "project_code required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    report.project_code = projectCode;
    const debug = !!body.debug;
    const overrideSubs: string[] | null = Array.isArray(body.override_subsystems) && body.override_subsystems.length
      ? body.override_subsystems.map((s: any) => String(s)) : null;
    // override_subsystems forces probe-only (no writes, no rollup updates, no cert upserts).
    const dryRun = !!body.dry_run || !!overrideSubs;

    let subsystems: string[];
    if (overrideSubs) {
      subsystems = overrideSubs;
    } else {
      const { data: sysRows, error: sysErr } = await supa
        .from("p2a_systems")
        .select("system_id, handover_plan_id, p2a_handover_plans!inner(project_code)")
        .eq("p2a_handover_plans.project_code", projectCode);
      if (sysErr) throw new Error(`p2a_systems query: ${sysErr.message}`);
      subsystems = (sysRows || []).map((r: any) => r.system_id).filter(Boolean);
      if (Array.isArray(body.system_ids) && body.system_ids.length) {
        const filter = new Set<string>(body.system_ids);
        subsystems = subsystems.filter((s: string) => filter.has(s));
      }
    }
    if (!subsystems.length) {
      report.errors.push("no subsystems found for project");
      return new Response(JSON.stringify(report), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tile name: caller > gohub_synced_systems lookup (skipped under override)
    let tileName: string | null = body.tile_name || null;
    if (!tileName && !overrideSubs) {
      const { data: tileRow } = await supa
        .from("gohub_synced_systems")
        .select("tile_name")
        .in("system_id", subsystems.slice(0, 5))
        .limit(1)
        .maybeSingle();
      tileName = tileRow?.tile_name || null;
    }
    if (!tileName) {
      report.errors.push("could not resolve tile_name for project; pass body.tile_name");
      return new Response(JSON.stringify(report), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    report.tile_name = tileName;

    const creds = await getGoCompletionsCredentials(supa);
    const session = new GocSessionManager(creds.portalUrl, creds.username, creds.password, tileName);

    // ── Discovery branch ───────────────────────────────────────
    // body.discover=true: probe the CompletionsGrid ASMX surface to find
    // the WebMethod that populates the subsystem-detail ITRS tab.
    // No writes. Returns method list + JS proxy + sample sub GUID.
    if (body.discover) {
      const disc: any = { asmx_base: null, help_page: null, js_proxy: null, page_scripts: [], itr_method_candidates: [], sample_subsystem: null, probe_results: [] };
      try {
        const grid = await session.getGridPage();
        const asmxBase = resolveAsmxServiceUrl(grid.html, grid.url);
        disc.asmx_base = asmxBase;
        const cookies = session.getCookies();
        const origin = new URL(grid.url).origin;

        const authedGet = async (url: string) => {
          try {
            const r = await fetch(url, {
              headers: {
                Cookie: formatCookies(cookies),
                "User-Agent": BROWSER_UA,
                Referer: grid.url,
                Accept: "text/html,application/javascript,*/*",
              },
            });
            const t = await r.text();
            return { status: r.status, contentType: r.headers.get("content-type"), body: t };
          } catch (e: any) {
            return { status: null, contentType: null, body: "", error: String(e?.message || e).slice(0, 200) };
          }
        };

        // 1. ASMX help page (no method) — lists every WebMethod
        if (asmxBase) {
          const help = await authedGet(asmxBase);
          // pull method names from anchor list and from <li> entries
          const methodSet = new Set<string>();
          const reA = /href=["'][^"']*CompletionsGrid\.asmx\?op=([A-Za-z0-9_]+)["']/gi;
          let m: RegExpExecArray | null;
          while ((m = reA.exec(help.body)) !== null) methodSet.add(m[1]);
          disc.help_page = {
            status: help.status,
            contentType: help.contentType,
            methods: Array.from(methodSet).sort(),
            excerpt: help.body.slice(0, 2048),
          };
          disc.itr_method_candidates = Array.from(methodSet)
            .filter((n) => /itr|inspection|itp|test/i.test(n))
            .sort();

          // 2. /js proxy — has parameter names per method
          const jsProxy = await authedGet(asmxBase + "/js");
          // capture per-method signature blocks: `MethodName:function(p1,p2,...,onSuccess...)`
          const sigs: any[] = [];
          const sigRe = /([A-Za-z0-9_]+)\s*:\s*function\s*\(([^)]*)\)/g;
          while ((m = sigRe.exec(jsProxy.body)) !== null) {
            sigs.push({ method: m[1], params: m[2].split(",").map((s) => s.trim()).filter(Boolean) });
          }
          disc.js_proxy = {
            status: jsProxy.status,
            contentType: jsProxy.contentType,
            length: jsProxy.body.length,
            signatures: sigs.filter((s) => methodSet.has(s.method)),
          };
        }

        // 3. scripts referenced from the grid page that might call ITR methods
        const scriptSrcs: string[] = [];
        const srcRe = /<script[^>]*src=["']([^"']+)["']/gi;
        let s: RegExpExecArray | null;
        while ((s = srcRe.exec(grid.html)) !== null) {
          const src = s[1];
          if (/CompletionsGrid|SubSystem|ITR|Detail|Modal/i.test(src)) scriptSrcs.push(src);
        }
        for (const src of scriptSrcs.slice(0, 8)) {
          const abs = src.startsWith("http") ? src : new URL(src, grid.url).toString();
          const js = await authedGet(abs);
          // search for ASMX method calls / fetches involving "ITR"
          const hits: string[] = [];
          const callRe = /(?:CompletionsGrid\.asmx\/[A-Za-z0-9_]+|\.([A-Za-z0-9_]*[Ii][Tt][Rr][A-Za-z0-9_]*)\s*\()/g;
          let h: RegExpExecArray | null;
          while ((h = callRe.exec(js.body)) !== null && hits.length < 20) hits.push(h[0]);
          disc.page_scripts.push({
            url: abs,
            status: js.status,
            length: js.body.length,
            hits: Array.from(new Set(hits)),
          });
        }

        // 4. GetSystems → grab one subsystem (preferably the override target if present)
        const sysResp = await session.callMethod("GetSystems", { itrClass: "All" });
        const arr: any[] = Array.isArray(sysResp)
          ? sysResp
          : (sysResp?.Items || sysResp?.data || sysResp?.results || sysResp?.Systems || []);
        const targetSub = overrideSubs?.[0] || subsystems[0];
        let foundSub: any = null;
        let foundSys: any = null;
        for (const sys of arr) {
          const subs = sys.SubSystem || sys.SubSystems || sys.Subsystems || sys.SubsystemList || sys.subSystems || [];
          for (const sub of subs) {
            const num = String(sub.Number || sub.SubSystemNumber || sub.Name || "").trim();
            if (num === targetSub) { foundSub = sub; foundSys = sys; break; }
          }
          if (foundSub) break;
        }
        if (foundSub) {
          disc.sample_subsystem = {
            looking_for: targetSub,
            number: foundSub.Number ?? foundSub.SubSystemNumber ?? foundSub.Name,
            keys: Object.keys(foundSub),
            full: foundSub,
            parent_system_keys: foundSys ? Object.keys(foundSys) : null,
            parent_system_id: foundSys?.ID || foundSys?.Id || foundSys?.SystemID || null,
          };
        } else {
          disc.sample_subsystem = { looking_for: targetSub, found: false, total_systems: arr.length };
        }

        // 5. Probe likely ITR methods if we have a sub GUID. Try a few payload shapes.
        const subGuid = foundSub?.ID || foundSub?.Id || foundSub?.SubSystemID || foundSub?.GUID || null;
        const sysGuid = foundSys?.ID || foundSys?.Id || foundSys?.SystemID || null;
        if (subGuid) {
          const candidates = Array.from(new Set([
            ...(disc.itr_method_candidates as string[]),
            "GetSubSystemITRs", "GetITRs", "GetSubSystemITR", "GetSubSystemITRList",
            "GetITRsForSubSystem", "GetITRList", "GetTagITRs", "GetSubSystemInspections",
          ]));
          const payloads = [
            { subSystemId: subGuid, itrClass: "All" },
            { subsystemId: subGuid, itrClass: "All" },
            { SubSystemID: subGuid, itrClass: "All" },
            { id: subGuid, itrClass: "All" },
            { subSystemId: subGuid },
            { subSystemId: subGuid, systemId: sysGuid, itrClass: "All" },
          ];
          for (const name of candidates) {
            for (const payload of payloads) {
              const diag: any[] = [];
              try {
                const r = await session.callMethod(name, payload, diag);
                const ok = r !== null && r !== undefined;
                disc.probe_results.push({
                  method: name,
                  payload,
                  ok,
                  status: diag[0]?.status,
                  contentType: diag[0]?.contentType,
                  body_excerpt: diag[0]?.body2kb?.slice(0, 400),
                  result_kind: Array.isArray(r) ? `array(${r.length})` : (r && typeof r === "object") ? `object(${Object.keys(r).join(",").slice(0, 120)})` : typeof r,
                  result_sample: Array.isArray(r) ? r.slice(0, 2) : (r && typeof r === "object") ? r : r,
                });
                if (ok && (Array.isArray(r) ? r.length : (typeof r === "object" && Object.keys(r).length))) {
                  // first hit is good enough; try other payloads to find best
                }
              } catch (e: any) {
                disc.probe_results.push({ method: name, payload, error: String(e?.message || e).slice(0, 200) });
              }
            }
          }
        }
      } catch (e: any) {
        disc.error = String(e?.message || e).slice(0, 300);
      }
      report.discovery = disc;
      return new Response(JSON.stringify(report, null, 2), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    // ── Per-subsystem: TagSearch + Punch ──
    for (const ss of subsystems) {
      report.subsystems_attempted++;
      const perSs: any = { subsystem: ss, itr: null, punch: null };
      try {
        const tag = await scrapeTagSearch(session, ss, debug);
        const items = tag.items || [];
        const aCount = items.filter((i: any) => i.ab_phase === "A").length;
        const bCount = items.filter((i: any) => i.ab_phase === "B").length;
        const outstanding = items.filter((i: any) => i.status === "open").length;
        perSs.itr = { ok: tag.ok, count: items.length, a: aCount, b: bCount, outstanding, reason: (tag as any).reason };
        if (debug) perSs.debug = (tag as any).debug;
        if (tag.ok && items.length && !dryRun) {
          const payload = tag.items.map((it) => ({
            project_code: projectCode, subsystem_number: ss, ...it,
            last_synced_at: new Date().toISOString(),
          }));
          const { error } = await supa.from("gohub_itr_items")
            .upsert(payload, { onConflict: "project_code,subsystem_number,tag_guid,itr_code" });
          if (error) perSs.itr.upsert_error = error.message;
          else report.itr_items_upserted += payload.length;
        }
      } catch (e: any) { perSs.itr = { ok: false, error: String(e?.message || e).slice(0, 200) }; }

      try {
        const punch = await scrapePunch(session, ss);
        perSs.punch = { ok: punch.ok, count: punch.items?.length || 0, reason: (punch as any).reason };
        if (punch.ok && punch.items.length && !dryRun) {
          const payload = punch.items.map((it) => ({
            project_code: projectCode, subsystem_number: ss, ...it,
            last_synced_at: new Date().toISOString(),
          }));
          const { error } = await supa.from("gohub_punch_items")
            .upsert(payload, { onConflict: "project_code,punchlist,item_no" });
          if (error) perSs.punch.upsert_error = error.message;
          else report.punch_items_upserted += payload.length;
        }
      } catch (e: any) { perSs.punch = { ok: false, error: String(e?.message || e).slice(0, 200) }; }

      if (perSs.itr?.ok || perSs.punch?.ok) report.subsystems_ok++;
      report.per_subsystem.push(perSs);
    }

    // ── Certificates pass via Fred handler (MCC, MCC-DAC, PCC, PCDAC, RFC, RFSU, RFO, RFOC) ──
    if (!body.skip_certs) {
      const certTypes = ["MCC", "MCC-DAC", "PCC", "PCDAC", "RFC", "RFSU", "RFOC"];
      for (const certType of certTypes) {
        report.cert_pass.attempted++;
        try {
          const res = await handleGetHandoverCertificateStatus(
            { project_code: tileName, certificate_type: certType },
            supa,
          );
          const certs = (res?.certificates || []) as any[];
          if (!certs.length) continue;
          report.cert_pass.ok++;
          if (dryRun) continue;
          const seen = new Set<string>();
          const payload: any[] = [];
          for (const c of certs) {
            const subsys = String(c.sub_system || c.SubSystem || "").trim() || null;
            const objectId = String(c.certificate_ref || c.Ref || c.Certificate || c.raw?.Ref || "").trim();
            const discipline = String(c.raw?.Discipline || c.discipline || "").trim();
            if (!objectId) continue;
            const key = `${certType}|${objectId}|${discipline}`;
            if (seen.has(key)) continue;
            seen.add(key);
            payload.push({
              project_code: projectCode,
              system_number: subsys ? null : (c.raw?.System || null),
              subsystem_number: subsys,
              cert_type: certType,
              object_id: objectId,
              discipline,
              status: String(c.raw?.Status || c.status || "").trim() || null,
              planned_date: parseDmyDate(c.raw?.["Planned Date"] || c.raw?.PlannedDate),
              actual_date: parseDmyDate(c.accepted_date || c.raw?.["Accepted Date"]),
              signed_by: String(c.raw?.["Accepted By"] || c.raw?.AcceptedBy || "").trim() || null,
              raw: c.raw || c,
              last_synced_at: new Date().toISOString(),
            });
          }
          if (payload.length) {
            const { error } = await supa.from("gohub_certificates")
              .upsert(payload, { onConflict: "project_code,cert_type,object_id,discipline" });
            if (error) report.cert_pass.errors.push(`${certType}: ${error.message}`);
            else report.certs_upserted += payload.length;
          }
        } catch (e: any) {
          report.cert_pass.errors.push(`${certType}: ${String(e?.message || e).slice(0, 200)}`);
        }
      }
    }

    // ── Rollup snapshot from GetSystems (authoritative totals per §4) ──
    // Unwrap aligned with _shared/fred/handlers handleGetCompletionStatus:
    // top-level may be array OR { Items | data | results | Systems }.
    // Subsystem children may be SubSystem | SubSystems | Subsystems | SubsystemList.
    try {
      const diagSync: any[] = [];
      // GetSystems requires the itrClass param — sending `{}` returns 500.
      const sysRespRaw = await session.callMethod("GetSystems", { itrClass: "All" }, debug ? diagSync : undefined);
      // Keep a parallel empty-payload probe in debug mode so regressions are visible.
      let diagFred: any[] = [];
      let fredRespRaw: any = null;
      if (debug) {
        try { fredRespRaw = await session.callMethod("GetSystems", {}, diagFred); }
        catch (e: any) { diagFred.push({ url: "<exception>", status: null, contentType: null, body2kb: "", error: String(e?.message || e).slice(0, 300) }); }
      }
      const sysResp: any = (sysRespRaw && typeof sysRespRaw === "object" && "d" in (sysRespRaw as any))
        ? (sysRespRaw as any).d
        : sysRespRaw;
      const arr: any[] = Array.isArray(sysResp)
        ? sysResp
        : (sysResp?.Items || sysResp?.data || sysResp?.results || sysResp?.Systems || []);
      if (debug) {
        const rawStr = (() => { try { return JSON.stringify(sysRespRaw); } catch { return String(sysRespRaw); } })();
        const outerKeys = (sysRespRaw && typeof sysRespRaw === "object") ? Object.keys(sysRespRaw as any) : ["<non-object>"];
        const topKeys = Array.isArray(sysResp) ? ["<array>"] : Object.keys(sysResp || {});
        const first = arr[0] || null;
        const firstKeys = first ? Object.keys(first) : [];
        const subKey = first ? (["SubSystem","SubSystems","Subsystems","SubsystemList","subSystems"].find((k) => Array.isArray((first as any)[k]))) : null;
        report.getsystems_top_keys = {
          outer_keys: outerKeys,
          unwrapped_d: outerKeys.includes("d"),
          top: topKeys,
          first_system_keys: firstKeys,
          subsystem_array_key: subKey,
          array_length: arr.length,
          raw_excerpt: rawStr.slice(0, 2048),
        };
        report.getsystems_diag = {
          sync_call: { payload: {}, attempts: diagSync, returned_null: sysRespRaw === null },
          fred_call: { payload: { itrClass: "All" }, attempts: diagFred, returned_null: fredRespRaw === null },
        };
      }
      const bySub: Record<string, { total: number; complete: number }> = {};
      for (const sys of arr) {
        const subs: any[] = sys.SubSystem || sys.SubSystems || sys.Subsystems
          || sys.SubsystemList || sys.subSystems || [];
        for (const sub of subs) {
          const num = String(sub.Number || sub.SubSystemNumber || sub.Name || "").trim();
          if (!num) continue;
          bySub[num] = {
            total: Number(sub.ITRs ?? sub.TotalITRs ?? 0),
            complete: Number(sub.ITRsComp ?? sub.ITRsCompleted ?? sub.CompleteITRs ?? 0),
          };
        }
      }
      report.rollup_subsystems_seen = Object.keys(bySub).length;
      const now = new Date().toISOString();
      for (const ss of subsystems) {
        const r = bySub[ss];
        if (!r) continue;
        if (dryRun) { report.rollup_updated++; continue; }
        const { error } = await supa
          .from("p2a_systems")
          .update({
            gohub_rollup_total_itrs: r.total,
            gohub_rollup_complete_itrs: r.complete,
            gohub_rollup_synced_at: now,
          })
          .eq("system_id", ss);
        if (!error) report.rollup_updated++;
      }
    } catch (e: any) {
      report.errors.push(`rollup: ${String(e?.message || e).slice(0, 200)}`);
    }

    return new Response(JSON.stringify(report, null, 2), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    report.errors.push(`fatal: ${String(e?.message || e).slice(0, 300)}`);
    return new Response(JSON.stringify(report, null, 2), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
