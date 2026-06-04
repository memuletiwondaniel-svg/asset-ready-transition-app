/**
 * One-off live probe to determine:
 *   a) How to programmatically fetch per-subsystem ITR lists from GoCompletions
 *   b) ITR cardinality (loop B-ITR: one row multi-tags, or repeated rows; unique ITR instance id?)
 *   c) Confirm punch item_no is per-punchlist (not per-project)
 *   d) Confirm MCC-DAC / PCDAC return per-discipline rows per subsystem
 *
 * Project under probe: DP-18F (West Qurna). Tile name match is case-insensitive substring.
 *
 * Returns a JSON report — not a sync. Safe to call repeatedly.
 *
 * POST body (all optional):
 *   { project_code?: string,        // default "DP18F"
 *     subsystem_hint?: string,      // a fragment of a real subsystem id to probe ITRs on
 *     punchlist_hint?: string }     // optional punchlist id fragment
 */

import { createClient } from "npm:@supabase/supabase-js@2.39.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import {
  GocSessionManager,
  getGoCompletionsCredentials,
  callAsmxMethod,
  parseRadGridTable,
  navigateToPage,
} from "../_shared/gocompletions-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const report: any = {
    project: null,
    a_itr_endpoint: { tried: [], working: null, sample: null },
    b_itr_cardinality: { note: "see a_itr_endpoint.sample", needs_human: true },
    c_punch_item_no: { sample_groups: [], per_punchlist_confirmed: null },
    d_dac_per_discipline: { sample_rows: [], per_discipline_confirmed: null },
    errors: [],
  };

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const projectCode = body.project_code || "DP18F";
    const subsystemHint: string | undefined = body.subsystem_hint;

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const creds = await getGoCompletionsCredentials(supa);
    const session = new GocSessionManager(creds.portalUrl, creds.username, creds.password, projectCode);

    // ── pick a subsystem ──
    const sysData = await session.callMethod("GetSystems", { itrClass: "All" });
    const systems = Array.isArray(sysData) ? sysData : (sysData?.Items || sysData?.Systems || []);
    report.project = { code: projectCode, systems_returned: systems.length, first_system: systems[0] || null };

    let subsystemId: string | null = subsystemHint || null;
    let subsystemRow: any = null;

    // Try a wide search for a subsystem under this project
    const searchTerm = subsystemHint || projectCode;
    const subs = await session.searchSubSystems(searchTerm);
    report.project.subsystems_search_count = subs.length;
    if (subs.length > 0) {
      subsystemRow = subs[0];
      subsystemId =
        subsystemRow.Number || subsystemRow.SubSystemNumber ||
        subsystemRow.Name || subsystemRow.Id || subsystemRow.SubSystem || subsystemId;
      report.project.first_subsystem = subsystemRow;
    }

    if (!subsystemId) {
      report.errors.push("Could not resolve a subsystem to probe; pass subsystem_hint.");
      return json(report);
    }

    // ── (a) Try multiple ASMX methods that might return ITRs for a subsystem ──
    const grid = await session.getGridPage();
    const candidateMethods: Array<{ name: string; body: Record<string, any> }> = [
      { name: "GetItrs",                body: { subSystem: subsystemId } },
      { name: "GetITRs",                body: { subSystem: subsystemId } },
      { name: "GetItrsForSubSystem",    body: { subSystem: subsystemId } },
      { name: "GetSubSystemItrs",       body: { subSystem: subsystemId } },
      { name: "GetItrItems",            body: { subSystem: subsystemId } },
      { name: "GetSubSystemDetails",    body: { subSystem: subsystemId } },
      { name: "GetItrs",                body: { SubSystemNumber: subsystemId } },
      { name: "GetItrs",                body: { subsystemId, itrClass: "All" } },
    ];

    for (const m of candidateMethods) {
      try {
        const r = await callAsmxMethod(session.getCookies(), grid.url, grid.html, m.name, m.body);
        const ok = r.data !== null && r.data !== undefined &&
                   !(Array.isArray(r.data) && r.data.length === 0);
        report.a_itr_endpoint.tried.push({
          method: m.name,
          body_keys: Object.keys(m.body),
          status: ok ? "data" : "empty_or_null",
          shape: shapeOf(r.data),
          rows: countRows(r.data),
        });
        if (ok && !report.a_itr_endpoint.working) {
          report.a_itr_endpoint.working = m.name;
          report.a_itr_endpoint.sample = trim(r.data);
        }
      } catch (e: any) {
        report.a_itr_endpoint.tried.push({ method: m.name, error: String(e).slice(0, 200) });
      }
    }

    // Fallback: try scraping the subsystem-modal ITRS tab via aspx
    if (!report.a_itr_endpoint.working) {
      try {
        const itrPagePaths = [
          `GoCompletions/Completions/SubSystemItrs.aspx?SubSystem=${encodeURIComponent(subsystemId)}`,
          `GoCompletions/Completions/ItrSearch.aspx?SubSystem=${encodeURIComponent(subsystemId)}`,
          `GoCompletions/Certification/ItrSearch.aspx?SubSystem=${encodeURIComponent(subsystemId)}`,
        ];
        for (const path of itrPagePaths) {
          try {
            const r = await navigateToPage(session.getCookies(), creds.portalUrl, path);
            const rows = parseRadGridTable(r.html);
            report.a_itr_endpoint.tried.push({
              method: "aspx:" + path,
              status: rows.length > 0 ? "data" : "empty",
              rows: rows.length,
              first_row_keys: rows[0] ? Object.keys(rows[0]) : [],
            });
            if (rows.length > 0 && !report.a_itr_endpoint.working) {
              report.a_itr_endpoint.working = "aspx:" + path;
              report.a_itr_endpoint.sample = rows.slice(0, 5);
            }
          } catch (e: any) {
            report.a_itr_endpoint.tried.push({ method: "aspx:" + path, error: String(e).slice(0, 200) });
          }
        }
      } catch (e: any) {
        report.errors.push("itr aspx probe: " + String(e).slice(0, 200));
      }
    }

    // ── (c) Confirm punch item_no is per-punchlist ──
    try {
      const punch = await navigateToPage(
        session.getCookies(), creds.portalUrl,
        "GoCompletions/Completions/PunchlistItemSearch.aspx",
      );
      const punchRows = parseRadGridTable(punch.html);
      // Group by punchlist column and list item numbers
      const groups: Record<string, number[]> = {};
      for (const r of punchRows.slice(0, 200)) {
        const pl = String(r.Punchlist || r["Punch List"] || r.PunchList || "");
        const itemNo = Number(r.Item || r["Item No"] || r.ItemNo || NaN);
        if (!pl || !Number.isFinite(itemNo)) continue;
        (groups[pl] ||= []).push(itemNo);
      }
      const sample = Object.entries(groups).slice(0, 5).map(([pl, nums]) => ({ punchlist: pl, items: nums }));
      report.c_punch_item_no.sample_groups = sample;
      // If item #1 appears in >1 punchlist, confirms per-punchlist numbering
      const onesIn = sample.filter(g => g.items.includes(1)).length;
      report.c_punch_item_no.per_punchlist_confirmed = onesIn >= 2;
      report.c_punch_item_no.first_row_keys = punchRows[0] ? Object.keys(punchRows[0]) : [];
    } catch (e: any) {
      report.errors.push("punch probe: " + String(e).slice(0, 200));
    }

    // ── (d) MCC-DAC per-discipline rows ──
    try {
      // MCC-DAC: gate 1, GroupBy=SubSystem,Discipline. TypeID is unknown, but the page may render the grid.
      const dacPath = `GoCompletions/Handovers/HandoverSearch.aspx?HandoverGate=1&GroupBy=SubSystem,Discipline&IsPartialHandover=False&IsMultiHandover=False&IsProcedure=False&HasInterimDate=False&AdditionalFilters=`;
      const dac = await navigateToPage(session.getCookies(), creds.portalUrl, dacPath);
      const dacRows = parseRadGridTable(dac.html);
      // Group by SubSystem and count distinct disciplines
      const byss: Record<string, Set<string>> = {};
      for (const r of dacRows.slice(0, 200)) {
        const ss = String(r["Sub System"] || r.SubSystem || r["SubSystem"] || "");
        const disc = String(r.Discipline || r["Discipline"] || "");
        if (!ss) continue;
        (byss[ss] ||= new Set()).add(disc);
      }
      report.d_dac_per_discipline.first_row_keys = dacRows[0] ? Object.keys(dacRows[0]) : [];
      report.d_dac_per_discipline.sample_rows = dacRows.slice(0, 5);
      report.d_dac_per_discipline.subsystem_discipline_fanout = Object.entries(byss)
        .slice(0, 5)
        .map(([ss, d]) => ({ subsystem: ss, disciplines: Array.from(d) }));
      report.d_dac_per_discipline.per_discipline_confirmed =
        Object.values(byss).some(s => s.size > 1);
    } catch (e: any) {
      report.errors.push("dac probe: " + String(e).slice(0, 200));
    }

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

function shapeOf(d: any): string {
  if (d === null || d === undefined) return "null";
  if (Array.isArray(d)) return `array(${d.length})` + (d[0] ? "<" + Object.keys(d[0]).slice(0, 8).join(",") + ">" : "");
  if (typeof d === "object") return "object<" + Object.keys(d).slice(0, 8).join(",") + ">";
  return typeof d;
}
function countRows(d: any): number {
  if (Array.isArray(d)) return d.length;
  if (d && Array.isArray(d.Items)) return d.Items.length;
  if (d && Array.isArray(d.Data)) return d.Data.length;
  return 0;
}
function trim(d: any): any {
  if (Array.isArray(d)) return d.slice(0, 5);
  if (d && Array.isArray(d.Items)) return { ...d, Items: d.Items.slice(0, 5) };
  return d;
}
