/**
 * Combined probe — locks in keys before schema work.
 *
 * For a chosen in-progress subsystem on a chosen project tile (default
 * WEST QURNA / DP-18 family, in-progress subsystem C013-DP304-101-01):
 *
 *  (a) TagSearch.aspx postback shape + presence of itr_instance_id
 *  (b) per-subsystem MC/PC count split availability in GetSystems
 *  (c) PunchlistItemSearch postback rows + per-punchlist item_no
 *  (d) HandoverSearch postback rows + per-discipline DAC fanout
 *
 * Read-only — same path as Fred handlers.
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
  postWithViewState,
} from "../_shared/gocompletions-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const report: any = {
    inputs: {},
    tile: null,
    chosen_subsystem: null,
    a_tagsearch: { row_count: 0, first_row_keys: [], itr_instance_id_field: null, sample: [] },
    b_mcpc_split: { system_keys: [], subsystem_keys: [], mc_pc_fields_found: [], evidence: null },
    c_punch: { row_count: 0, first_row_keys: [], per_punchlist_confirmed: null, sample_groups: [] },
    d_dac: { row_count: 0, first_row_keys: [], per_discipline_confirmed: null, sample_rows: [], subsystem_discipline_fanout: [] },
    errors: [],
  };

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const tileMatch = String(body.tile_match || "westqurna").toLowerCase().replace(/[^a-z0-9]/g, "");
    const projectFamilyRe = new RegExp(body.project_family_regex || "DP[\\s-]*18", "i");
    const targetSubsystemSubstr: string = body.subsystem_number || "C013-DP304-101-01";
    report.inputs = { tileMatch, projectFamilyRe: projectFamilyRe.source, targetSubsystemSubstr };

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const creds = await getGoCompletionsCredentials(supa);

    // 1. Login + tile select
    const login = await loginGoCompletions(creds.portalUrl, creds.username, creds.password);
    const tiles = extractAllProjectTiles(login.homePageHtml);
    const tile = tiles.find(t => t.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(tileMatch));
    if (!tile) { report.errors.push("No tile matched " + tileMatch); return json(report); }
    report.tile = tile.name;

    const sel = await selectProjectTile(login.cookies, login.homePageHtml, login.homePageUrl, tile);
    const grid = await navigateToCompletionsGrid(sel.cookies, creds.portalUrl, sel.responseHtml, sel.responseUrl);
    let cookies = grid.cookies;

    // 2. GetSystems → find chosen in-progress subsystem + (b) MC/PC field probe
    let chosenSub: any = null;
    let chosenSys: any = null;
    try {
      const r = await callAsmxMethod(cookies, grid.url, grid.html, "GetSystems", { itrClass: "All" });
      cookies = r.cookies;
      const list: any[] = Array.isArray(r.data) ? r.data : (r.data?.Items || r.data?.Systems || []);
      const fam = list.filter(s => projectFamilyRe.test(String(s.Number || "")));
      for (const sys of fam) {
        const subs: any[] = Array.isArray(sys?.SubSystem) ? sys.SubSystem : [];
        const hit = subs.find(x => String(x.Number || "").includes(targetSubsystemSubstr));
        if (hit) { chosenSys = sys; chosenSub = hit; break; }
      }
      // Fallback: first in-progress subsystem in family
      if (!chosenSub) {
        for (const sys of fam) {
          const subs: any[] = Array.isArray(sys?.SubSystem) ? sys.SubSystem : [];
          const hit = subs.find(x => Number(x.ITRsComp ?? 0) < Number(x.ITRs ?? 0) && Number(x.ITRs ?? 0) > 0);
          if (hit) { chosenSys = sys; chosenSub = hit; break; }
        }
      }
      // (b) inspect keys for MC/PC split
      if (chosenSys) report.b_mcpc_split.system_keys = Object.keys(chosenSys);
      if (chosenSub) {
        report.b_mcpc_split.subsystem_keys = Object.keys(chosenSub);
        const mcpcKeys = Object.keys(chosenSub).filter(k =>
          /^(mc|pc|a_?itr|b_?itr|mech|pre).*(s|comp|total|count)?$/i.test(k) ||
          /^itrs?(_)?(a|b|mc|pc)/i.test(k)
        );
        report.b_mcpc_split.mc_pc_fields_found = mcpcKeys;
        report.b_mcpc_split.evidence = {
          Number: chosenSub.Number, ID: chosenSub.ID,
          ITRs: chosenSub.ITRs, ITRsComp: chosenSub.ITRsComp,
          ...Object.fromEntries(mcpcKeys.map(k => [k, chosenSub[k]])),
        };
        report.chosen_subsystem = { Number: chosenSub.Number, ID: chosenSub.ID, ITRs: chosenSub.ITRs, ITRsComp: chosenSub.ITRsComp };
      }
    } catch (e: any) {
      report.errors.push("GetSystems: " + String(e).slice(0, 300));
    }

    if (!chosenSub) {
      report.errors.push("No in-progress subsystem resolved");
      return json(report);
    }
    const subNum: string = chosenSub.Number;

    // (a) TagSearch postback for ITRs on subsystem
    try {
      const ts = await navigateToPage(cookies, creds.portalUrl, "GoCompletions/Completions/TagSearch.aspx");
      cookies = ts.cookies;
      const prefix = "ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i0$TagSearch_PrimarySearchCriteria$";
      const searchParams: Record<string, string> = {
        [`${prefix}SubSystem`]: subNum,
        "ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i7$SearchButton_input": "Search",
      };
      const { html: resultHtml, cookies: c2 } = await postWithViewState(cookies, ts.url, ts.html, searchParams);
      cookies = c2;
      const rows = parseRadGridTable(resultHtml);
      report.a_tagsearch.row_count = rows.length;
      report.a_tagsearch.first_row_keys = rows[0] ? Object.keys(rows[0]) : [];
      report.a_tagsearch.sample = rows.slice(0, 8);
      // detect instance-id field
      const candidate = rows[0] ? Object.keys(rows[0]).find(k =>
        /instance|loop|group|itr.?id|recordid|itrno|itr.?#/i.test(k)
      ) : null;
      report.a_tagsearch.itr_instance_id_field = candidate || null;
    } catch (e: any) {
      report.errors.push("tagsearch: " + String(e).slice(0, 300));
    }

    // (c) PunchlistItemSearch postback for subsystem
    try {
      const pl = await navigateToPage(cookies, creds.portalUrl, "GoCompletions/Completions/PunchlistItemSearch.aspx");
      cookies = pl.cookies;
      // Try a few possible SubSystem field name patterns; only one will exist
      const candidates = [
        "ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i0$PunchlistItemSearch_PrimarySearchCriteria$SubSystem",
        "ctl00$ContentPlaceHolder1$SubSystem",
      ];
      let rows: any[] = [];
      for (const key of candidates) {
        const params: Record<string, string> = { [key]: subNum };
        // Search button names vary — pass a few
        params["ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i7$SearchButton_input"] = "Search";
        try {
          const { html: rh, cookies: cc } = await postWithViewState(cookies, pl.url, pl.html, params);
          cookies = cc;
          const r = parseRadGridTable(rh);
          if (r.length > 0) { rows = r; break; }
        } catch (_) { /* ignore, try next */ }
      }
      report.c_punch.row_count = rows.length;
      report.c_punch.first_row_keys = rows[0] ? Object.keys(rows[0]) : [];
      const groups: Record<string, number[]> = {};
      for (const r of rows.slice(0, 500)) {
        const plKey = String(r.Punchlist || r["Punch List"] || r.PunchList || "");
        const itemNo = Number(r.Item || r["Item No"] || r.ItemNo || NaN);
        if (!plKey || !Number.isFinite(itemNo)) continue;
        (groups[plKey] ||= []).push(itemNo);
      }
      report.c_punch.sample_groups = Object.entries(groups).slice(0, 8).map(([p, n]) => ({ punchlist: p, items: n.sort((a,b)=>a-b).slice(0,10) }));
      report.c_punch.per_punchlist_confirmed = report.c_punch.sample_groups.filter((g:any) => g.items.includes(1)).length >= 2;
    } catch (e: any) {
      report.errors.push("punch: " + String(e).slice(0, 300));
    }

    // (d) HandoverSearch with GroupBy=SubSystem,Discipline (MCC-DAC TypeID hardcoded for confirmation)
    try {
      const dacPath = `GoCompletions/Handovers/HandoverSearch.aspx?HandoverGate=1&GroupBy=SubSystem,Discipline&IsPartialHandover=False&IsMultiHandover=False&IsProcedure=False&HasInterimDate=False&AdditionalFilters=`;
      const dac = await navigateToPage(cookies, creds.portalUrl, dacPath);
      cookies = dac.cookies;
      const rows = parseRadGridTable(dac.html);
      report.d_dac.row_count = rows.length;
      report.d_dac.first_row_keys = rows[0] ? Object.keys(rows[0]) : [];
      report.d_dac.sample_rows = rows.slice(0, 8);
      const byss: Record<string, Set<string>> = {};
      for (const r of rows.slice(0, 500)) {
        const ss = String(r["Sub System"] || r.SubSystem || "");
        const disc = String(r.Discipline || "");
        if (!ss) continue;
        (byss[ss] ||= new Set()).add(disc);
      }
      report.d_dac.subsystem_discipline_fanout =
        Object.entries(byss).slice(0, 8).map(([ss, d]) => ({ subsystem: ss, disciplines: Array.from(d) }));
      report.d_dac.per_discipline_confirmed = Object.values(byss).some(s => s.size > 1);
    } catch (e: any) {
      report.errors.push("dac: " + String(e).slice(0, 300));
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
