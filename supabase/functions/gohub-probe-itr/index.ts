/**
 * Live ITR probe for DP-18F. See file in repo for goals (a-d).
 * Uses fresh login + tile select + grid nav directly (does not rely on
 * GocSessionManager.getGridPage which can fail without postSelection HTML).
 */

import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import {
  getGoCompletionsCredentials,
  loginGoCompletions,
  extractAllProjectTiles,
  selectProjectTile,
  navigateToCompletionsGrid,
  navigateToPage,
  callAsmxMethod,
  parseRadGridTable,
} from "../_shared/gocompletions-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const report: any = {
    project: null,
    tiles: [],
    selected_tile: null,
    grid_url: null,
    a_itr_endpoint: { tried: [], working: null, sample: null },
    b_itr_cardinality: { note: "see a_itr_endpoint.sample", needs_human: true },
    c_punch_item_no: { sample_groups: [], per_punchlist_confirmed: null, first_row_keys: [] },
    d_dac_per_discipline: { sample_rows: [], per_discipline_confirmed: null, first_row_keys: [] },
    errors: [],
  };

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const projectMatch = String(body.project_code || "DP-18F").toLowerCase().replace(/[^a-z0-9]/g, "");
    const subsystemHint: string | undefined = body.subsystem_hint;

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const creds = await getGoCompletionsCredentials(supa);

    // 1. Login + tile select
    const login = await loginGoCompletions(creds.portalUrl, creds.username, creds.password);
    const tiles = extractAllProjectTiles(login.homePageHtml);
    report.tiles = tiles.map(t => t.name);
    const tile = tiles.find(t => t.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(projectMatch));
    if (!tile) {
      report.errors.push(`No tile matched ${projectMatch}. Available: ${report.tiles.join(", ")}`);
      return json(report);
    }
    report.selected_tile = tile.name;

    const sel = await selectProjectTile(login.cookies, login.homePageHtml, login.homePageUrl, tile);
    const grid = await navigateToCompletionsGrid(sel.cookies, creds.portalUrl, sel.responseHtml, sel.responseUrl);
    let cookies = grid.cookies;
    report.grid_url = grid.url;

    // 2. GetSystems returns systems with nested SubSystem[] — no separate call needed
    let subsystemId: string | null = subsystemHint || null;
    let subsystemGuid: string | null = null;

    try {
      const r = await callAsmxMethod(cookies, grid.url, grid.html, "GetSystems", { itrClass: "All" });
      cookies = r.cookies;
      const list = Array.isArray(r.data) ? r.data : (r.data?.Items || r.data?.Systems || []);
      const dp18 = list.filter((s: any) => /DP[\s-]*18/i.test(String(s.Number || "")));
      const sys = dp18[0] || list[0];
      const subs: any[] = Array.isArray(sys?.SubSystem) ? sys.SubSystem : [];
      const picked = subsystemHint ? subs.find(x => String(x.Number).includes(subsystemHint)) || subs[0] : subs[0];
      report.project = {
        systems_total: list.length,
        dp18_systems_count: dp18.length,
        chosen_system: { Number: sys?.Number, ID: sys?.ID, Description: sys?.Description },
        chosen_subsystem_count: subs.length,
        chosen_subsystem: picked || null,
      };
      if (picked) { subsystemId = picked.Number; subsystemGuid = picked.ID; }
    } catch (e: any) {
      report.errors.push("GetSystems: " + String(e).slice(0, 200));
    }

    if (!subsystemId) {
      report.errors.push("No subsystem resolved; cannot probe ITRs.");
    } else {
      const candidates: Array<{ name: string; body: Record<string, any> }> = [
        { name: "GetItrs",              body: { subSystem: subsystemId } },
        { name: "GetItrs",              body: { subSystemNumber: subsystemId } },
        { name: "GetItrs",              body: { subSystemID: subsystemGuid } },
        { name: "GetItrs",              body: { subSystemId: subsystemGuid } },
        { name: "GetItrs",              body: { id: subsystemGuid } },
        { name: "GetITRs",              body: { subSystem: subsystemId } },
        { name: "GetItrItems",          body: { subSystem: subsystemId } },
        { name: "GetItrItems",          body: { subSystemID: subsystemGuid } },
        { name: "GetSubSystemDetails",  body: { subSystem: subsystemId } },
        { name: "GetSubSystemDetails",  body: { subSystemID: subsystemGuid } },
        { name: "GetSubSystemDetails",  body: { id: subsystemGuid } },
        { name: "GetTags",              body: { subSystem: subsystemId } },
        { name: "GetTags",              body: { subSystemID: subsystemGuid } },
        { name: "GetTagItrs",           body: { subSystem: subsystemId } },
        { name: "GetTagItrs",           body: { subSystemID: subsystemGuid } },
        { name: "GetCertificationData", body: { subSystemID: subsystemGuid } },
      ];

      for (const m of candidates) {
        try {
          const r = await callAsmxMethod(cookies, grid.url, grid.html, m.name, m.body);
          cookies = r.cookies;
          const rows = countRows(r.data);
          report.a_itr_endpoint.tried.push({
            method: m.name, body_keys: Object.keys(m.body),
            shape: shapeOf(r.data), rows,
          });
          if (rows > 0 && !report.a_itr_endpoint.working) {
            report.a_itr_endpoint.working = m.name + "(" + Object.keys(m.body).join(",") + ")";
            report.a_itr_endpoint.sample = trim(r.data);
          }
        } catch (e: any) {
          report.a_itr_endpoint.tried.push({ method: m.name, error: String(e).slice(0, 200) });
        }
      }

      // Fallback: try scraping aspx pages
      const itrAspx = [
        `GoCompletions/Completions/ItrSearch.aspx?SubSystem=${encodeURIComponent(subsystemId)}`,
        `GoCompletions/Certification/ItrSearch.aspx?SubSystem=${encodeURIComponent(subsystemId)}`,
        `GoCompletions/Completions/SubSystemItrs.aspx?SubSystem=${encodeURIComponent(subsystemId)}`,
      ];
      for (const path of itrAspx) {
        try {
          const r = await navigateToPage(cookies, creds.portalUrl, path);
          cookies = r.cookies;
          const rows = parseRadGridTable(r.html);
          report.a_itr_endpoint.tried.push({
            method: "aspx:" + path.split("?")[0], rows: rows.length,
            first_row_keys: rows[0] ? Object.keys(rows[0]) : [],
          });
          if (rows.length > 0 && !report.a_itr_endpoint.working) {
            report.a_itr_endpoint.working = "aspx:" + path;
            report.a_itr_endpoint.sample = rows.slice(0, 5);
          }
        } catch (e: any) {
          report.a_itr_endpoint.tried.push({ method: "aspx:" + path.split("?")[0], error: String(e).slice(0, 200) });
        }
      }
    }

    // 4. Punch (c) — confirm item_no per-punchlist
    try {
      const punch = await navigateToPage(cookies, creds.portalUrl, "GoCompletions/Completions/PunchlistItemSearch.aspx");
      cookies = punch.cookies;
      const rows = parseRadGridTable(punch.html);
      report.c_punch_item_no.first_row_keys = rows[0] ? Object.keys(rows[0]) : [];
      const groups: Record<string, number[]> = {};
      for (const r of rows.slice(0, 300)) {
        const pl = String(r.Punchlist || r["Punch List"] || r.PunchList || "");
        const itemNo = Number(r.Item || r["Item No"] || r.ItemNo || NaN);
        if (!pl || !Number.isFinite(itemNo)) continue;
        (groups[pl] ||= []).push(itemNo);
      }
      const sample = Object.entries(groups).slice(0, 6).map(([pl, nums]) => ({ punchlist: pl, items: nums }));
      report.c_punch_item_no.sample_groups = sample;
      report.c_punch_item_no.per_punchlist_confirmed = sample.filter(g => g.items.includes(1)).length >= 2;
    } catch (e: any) {
      report.errors.push("punch probe: " + String(e).slice(0, 200));
    }

    // 5. DAC (d) — per-discipline rows
    try {
      const dacPath = `GoCompletions/Handovers/HandoverSearch.aspx?HandoverGate=1&GroupBy=SubSystem,Discipline&IsPartialHandover=False&IsMultiHandover=False&IsProcedure=False&HasInterimDate=False&AdditionalFilters=`;
      const dac = await navigateToPage(cookies, creds.portalUrl, dacPath);
      cookies = dac.cookies;
      const rows = parseRadGridTable(dac.html);
      report.d_dac_per_discipline.first_row_keys = rows[0] ? Object.keys(rows[0]) : [];
      report.d_dac_per_discipline.sample_rows = rows.slice(0, 5);
      const byss: Record<string, Set<string>> = {};
      for (const r of rows.slice(0, 300)) {
        const ss = String(r["Sub System"] || r.SubSystem || "");
        const disc = String(r.Discipline || "");
        if (!ss) continue;
        (byss[ss] ||= new Set()).add(disc);
      }
      report.d_dac_per_discipline.subsystem_discipline_fanout =
        Object.entries(byss).slice(0, 5).map(([ss, d]) => ({ subsystem: ss, disciplines: Array.from(d) }));
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
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function shapeOf(d: any): string {
  if (d === null || d === undefined) return "null";
  if (Array.isArray(d)) return `array(${d.length})` + (d[0] && typeof d[0] === "object" ? "<" + Object.keys(d[0]).slice(0, 8).join(",") + ">" : "");
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
