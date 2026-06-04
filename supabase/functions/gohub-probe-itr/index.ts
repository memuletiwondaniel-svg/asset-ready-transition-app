/**
 * Combined probe v2 — uses GocSessionManager (Fred-warmed) + raw row capture.
 *
 *  - Reuses Fred's working path (handleSearchCompletionsTags style).
 *  - Captures RAW <tr> innerHTML to expose hidden ids / drill-link hrefs that
 *    parseRadGridTable strips. Critical for finding a stable per-ITR id.
 *  - Same warmed session for Punch + DAC postbacks.
 */

import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import {
  GocSessionManager,
  getGoCompletionsCredentials,
  postWithViewState,
  parseRadGridTable,
  extractHiddenFields,
} from "../_shared/gocompletions-auth.ts";
import { handleSearchCompletionsTags, handleGetPunchlistDetails } from "../_shared/fred/handlers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const report: any = {
    inputs: {},
    chosen_subsystem: null,
    tagsearch: {
      form_action: null,
      search_button_inputs: [],
      raw_html_len: 0,
      contains_rgMasterTable: false,
      err_marker: null,
      parsed_row_count: 0,
      first_row_keys: [],
      raw_first_row_html: null,
      drill_link_samples: [],
      hrefs_in_rows: [],
      hidden_inputs_in_rows: [],
      itr_id_field_candidates: [],
      itr_code_repetition: { unique_itr_codes: 0, total_rows: 0, max_repeat: 0, repeating_examples: [] },
      a_b_suffix_breakdown: {},
      sample_rows: [],
    },
    punch: { parsed_row_count: 0, first_row_keys: [], per_punchlist_confirmed: null, sample_groups: [], err: null },
    dac:   { parsed_row_count: 0, first_row_keys: [], per_discipline_confirmed: null, sample_rows: [], err: null },
    fred_direct_tagsearch: { found: false, returned: 0, total_available: 0, keys: [], sample: [] },
    fred_direct_punch: { count: 0, keys: [], sample: [] },
    errors: [],

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const projectCode = body.project_code || "WEST QURNA"; // matches tile name substring
    const subsystemNumber: string = body.subsystem_number || "C013-DP18A-08X"; // in-progress (32/33)
    report.inputs = { projectCode, subsystemNumber };

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const creds = await getGoCompletionsCredentials(supa);
    const session = new GocSessionManager(creds.portalUrl, creds.username, creds.password, projectCode);

    // ── TAG SEARCH (raw) ────────────────────────────────────────
    try {
      const { html, url, cookies } = await session.navigateTo("GoCompletions/Completions/TagSearch.aspx");
      // discover form action & all input[type=submit/button] candidates
      const actionMatch = html.match(/<form[^>]*action=["']([^"']+)["']/i);
      report.tagsearch.form_action = actionMatch?.[1] ?? null;
      const btnRe = /<input[^>]*type=["'](?:submit|button)["'][^>]*name=["']([^"']+)["'][^>]*(?:value=["']([^"']*)["'])?/gi;
      const btns: any[] = []; let m;
      while ((m = btnRe.exec(html)) !== null) {
        if (/search|find|go/i.test(m[1]) || /search|find|go/i.test(m[2] || "")) {
          btns.push({ name: m[1], value: m[2] || null });
        }
      }
      report.tagsearch.search_button_inputs = btns.slice(0, 10);

      // post
      const prefix = "ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i0$TagSearch_PrimarySearchCriteria$";
      const searchParams: Record<string, string> = {
        [`${prefix}SubSystem`]: subsystemNumber,
        // include both possible search button names
        "ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i7$SearchButton_input": "Search",
        "ctl00$ContentPlaceHolder1$MasterRadPanelBar$i0$i7$SearchButton": "Search",
      };
      const { html: resultHtml } = await postWithViewState(cookies, url, html, searchParams);

      report.tagsearch.raw_html_len = resultHtml.length;
      report.tagsearch.contains_rgMasterTable = /rgMasterTable/i.test(resultHtml);
      const errM = resultHtml.match(/<span[^>]*ErrorLabel[^>]*>([\s\S]*?)<\/span>/i)
        || resultHtml.match(/<div[^>]*class=["'][^"']*alert[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      report.tagsearch.err_marker = errM ? errM[1].replace(/<[^>]+>/g, "").trim().slice(0, 200) : null;

      // parsed rows (Fred-style)
      const rows = parseRadGridTable(resultHtml);
      report.tagsearch.parsed_row_count = rows.length;
      report.tagsearch.first_row_keys = rows[0] ? Object.keys(rows[0]) : [];
      report.tagsearch.sample_rows = rows.slice(0, 5);

      // raw row capture — preserves hrefs and hidden inputs
      const tableMatch = resultHtml.match(/<table[^>]*class="[^"]*rgMasterTable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const tableHtml = tableMatch[1];
        const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
        const bodyHtml = tbodyMatch ? tbodyMatch[1] : tableHtml;
        const trRe = /<tr[^>]*class="[^"]*rg(?:Row|AltRow)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowIdx = 0; let rowMatch: RegExpExecArray | null;
        const allHrefs = new Set<string>();
        const allHidden = new Set<string>();
        while ((rowMatch = trRe.exec(bodyHtml)) !== null) {
          if (rowIdx === 0) report.tagsearch.raw_first_row_html = rowMatch[0].slice(0, 4000);
          const trHtml = rowMatch[1];
          // hrefs in row
          const hrefRe = /href=["']([^"']+)["']/gi; let h;
          while ((h = hrefRe.exec(trHtml)) !== null) {
            const href = h[1];
            if (rowIdx < 3 && report.tagsearch.drill_link_samples.length < 8) {
              report.tagsearch.drill_link_samples.push({ row: rowIdx, href });
            }
            allHrefs.add(href.split("?")[0]);
          }
          // hidden inputs in row
          const hidRe = /<input[^>]*type=["']hidden["'][^>]*name=["']([^"']+)["'][^>]*(?:value=["']([^"']*)["'])?/gi;
          let hh;
          while ((hh = hidRe.exec(trHtml)) !== null) {
            allHidden.add(hh[1]);
            if (rowIdx < 3 && report.tagsearch.hidden_inputs_in_rows.length < 8) {
              report.tagsearch.hidden_inputs_in_rows.push({ row: rowIdx, name: hh[1], value: hh[2] || "" });
            }
          }
          rowIdx++;
        }
        report.tagsearch.hrefs_in_rows = Array.from(allHrefs).slice(0, 12);
        // candidate id fields: hidden input names matching itr/id/guid; or query params in hrefs
        const candidates = new Set<string>();
        for (const n of allHidden) if (/itr|id|guid|key/i.test(n)) candidates.add("hidden:" + n.split("$").pop());
        for (const href of allHrefs) {
          try {
            const u = new URL(href, "https://x/");
            for (const k of u.searchParams.keys()) {
              if (/itr|id|guid|key/i.test(k)) candidates.add(`qs:${k}`);
            }
          } catch { /* relative non-url */ }
        }
        report.tagsearch.itr_id_field_candidates = Array.from(candidates).slice(0, 20);
      }

      // ITR code repetition + A/B breakdown
      if (rows.length) {
        const itrKey = Object.keys(rows[0]).find(k => /^ITR$/i.test(k) || /itr.?code|itr.?no|itr.?#/i.test(k));
        if (itrKey) {
          const freq = new Map<string, number>();
          for (const r of rows) {
            const v = String(r[itrKey] || "").trim();
            if (!v) continue;
            freq.set(v, (freq.get(v) || 0) + 1);
          }
          const reps = [...freq.entries()].filter(([_, n]) => n > 1).slice(0, 8);
          report.tagsearch.itr_code_repetition = {
            unique_itr_codes: freq.size, total_rows: rows.length,
            max_repeat: reps.reduce((m, [_, n]) => Math.max(m, n), 1),
            repeating_examples: reps.map(([c, n]) => ({ itr_code: c, count: n })),
          };
          // A/B suffix
          const split: Record<string, number> = {};
          for (const c of freq.keys()) {
            const tail = c.match(/([A-Za-z])\s*$/);
            const k = tail ? tail[1].toUpperCase() : "?";
            split[k] = (split[k] || 0) + 1;
          }
          report.tagsearch.a_b_suffix_breakdown = split;
        }
      }
    } catch (e: any) {
      report.errors.push("tagsearch: " + String(e?.message || e).slice(0, 300));
    }

    // ── PUNCH ───────────────────────────────────────────────────
    try {
      const { html, url, cookies } = await session.navigateTo("GoCompletions/Completions/PunchlistItemSearch.aspx");
      // discover prefix from form field names
      const subFieldRe = /name=["']([^"']*SubSystem[^"']*)["']/i;
      const subField = html.match(subFieldRe)?.[1];
      const btnFieldRe = /name=["']([^"']*Search[^"']*Button[^"']*)["']/i;
      const btnField = html.match(btnFieldRe)?.[1];
      const params: Record<string, string> = {};
      if (subField) params[subField] = subsystemNumber;
      if (btnField) params[btnField + "_input"] = "Search";
      params["__EVENTTARGET"] = "";
      const { html: resultHtml } = await postWithViewState(cookies, url, html, params);
      const rows = parseRadGridTable(resultHtml);
      report.punch.parsed_row_count = rows.length;
      report.punch.first_row_keys = rows[0] ? Object.keys(rows[0]) : [];
      const groups: Record<string, number[]> = {};
      for (const r of rows.slice(0, 800)) {
        const pl = String(r.Punchlist || r["Punch List"] || r.PunchList || "");
        const itemNo = Number(r.Item || r["Item No"] || r.ItemNo || NaN);
        if (!pl || !Number.isFinite(itemNo)) continue;
        (groups[pl] ||= []).push(itemNo);
      }
      report.punch.sample_groups = Object.entries(groups).slice(0, 8).map(([p, n]) => ({ punchlist: p, items: n.sort((a,b)=>a-b).slice(0,12) }));
      report.punch.per_punchlist_confirmed = report.punch.sample_groups.filter((g:any) => g.items.includes(1)).length >= 2;
    } catch (e: any) {
      report.punch.err = String(e?.message || e).slice(0, 300);
    }

    // ── DAC ─────────────────────────────────────────────────────
    try {
      const path = `GoCompletions/Handovers/HandoverSearch.aspx?HandoverGate=1&GroupBy=SubSystem,Discipline&IsPartialHandover=False&IsMultiHandover=False&IsProcedure=False&HasInterimDate=False&AdditionalFilters=`;
      const { html, url, cookies } = await session.navigateTo(path);
      // attempt a search-button postback to materialize rows
      const btnField = html.match(/name=["']([^"']*Search[^"']*Button[^"']*)["']/i)?.[1];
      const params: Record<string, string> = {};
      if (btnField) params[btnField + "_input"] = "Search";
      const { html: resultHtml } = btnField
        ? await postWithViewState(cookies, url, html, params)
        : { html };
      const rows = parseRadGridTable(resultHtml);
      report.dac.parsed_row_count = rows.length;
      report.dac.first_row_keys = rows[0] ? Object.keys(rows[0]) : [];
      report.dac.sample_rows = rows.slice(0, 8);
      const byss: Record<string, Set<string>> = {};
      for (const r of rows.slice(0, 800)) {
        const ss = String(r["Sub System"] || r.SubSystem || "");
        const disc = String(r.Discipline || "");
        if (!ss) continue;
        (byss[ss] ||= new Set()).add(disc);
      }
      (report.dac as any).subsystem_discipline_fanout =
        Object.entries(byss).slice(0, 8).map(([ss, d]) => ({ subsystem: ss, disciplines: Array.from(d) }));
      report.dac.per_discipline_confirmed = Object.values(byss).some(s => s.size > 1);
    } catch (e: any) {
      report.dac.err = String(e?.message || e).slice(0, 300);
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
