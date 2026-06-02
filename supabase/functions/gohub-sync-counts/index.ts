import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  loginGoCompletions,
  extractAllProjectTiles,
  navigateToCompletionsGrid,
  callAsmxMethod,
  followRedirects,
  formatCookies,
  BROWSER_UA,
  parseCookiesFromResponse,
  getGoCompletionsCredentials,
} from "../_shared/gocompletions-auth.ts";
import {
  iterateProjectTilesFreshSession,
  type TileStatus,
} from "../_shared/gohub-tile-iterator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── System Counts Data Type ─────────────────────────────────

interface SystemCounts {
  system_id: string;
  name: string;
  itr_a_count: number;
  itr_b_count: number;
  itr_total_count: number;
  punchlist_a_count: number;
  punchlist_b_count: number;
  completion_percentage: number;
}

function buildProjectSearchTerms(projectFilter: string): string[] {
  const raw = String(projectFilter || '').trim();
  if (!raw) return [];

  const upper = raw.toUpperCase();
  const compact = upper.replace(/[^A-Z0-9]/g, '');
  const dashed = compact.replace(/^([A-Z]+)(\d+)$/, '$1-$2');
  const spaced = compact.replace(/^([A-Z]+)(\d+)$/, '$1 $2');

  const aliases = new Set([upper, compact, dashed, spaced]);

  if (compact === 'DP300') {
    aliases.add('HM');
    aliases.add('HAMMAR MISHRIF');
    aliases.add('HM ADDITIONAL COMPRESSORS');
    aliases.add('ADDITIONAL COMPRESSORS');
  }

  return [...aliases].filter(Boolean);
}

// ─── Extract counts from GoCompletions raw data ──────────────

function parseSystemCounts(rawData: any[]): SystemCounts[] {
  const results: SystemCounts[] = [];
  const seen = new Set<string>();

  for (const item of rawData) {
    if (!item || typeof item !== "object") continue;

    const sysId = String(
      item.Number || item.SystemNumber || item.Name || item.SubSystemName ||
      item.SystemId || item.system_id || item.Id || item.CODE || ""
    );
    if (!sysId || seen.has(sysId)) continue;
    seen.add(sysId);

    const name = String(
      item.Description || item.SystemDescription || item.SubSystemDescription ||
      item.Title || item.NAME || sysId
    );

    let completion = 0;
    const pctValue = item.Complete ?? item.Progress ?? item.OverallProgress ??
      item.Percent ?? item.CompletionPercent ?? item.percentage ?? null;
    if (pctValue !== null && pctValue !== undefined) {
      const parsed = parseFloat(String(pctValue).replace("%", ""));
      if (!isNaN(parsed)) {
        completion = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
      }
    }

    const itrA = extractIntField(item, [
      'ITR_A', 'ITRA', 'ItrA', 'itr_a', 'ITR_A_Count', 'ITRACount',
      'ITR_A_Outstanding', 'ItrAOutstanding', 'itrACount', 'ITRACnt',
      'ITR_Cat_A', 'ITRCatA', 'CategoryA_ITR', 'Cat_A_ITR',
      'OpenITRA', 'Open_ITR_A', 'OutstandingITRA',
    ]);
    const itrB = extractIntField(item, [
      'ITR_B', 'ITRB', 'ItrB', 'itr_b', 'ITR_B_Count', 'ITRBCount',
      'ITR_B_Outstanding', 'ItrBOutstanding', 'itrBCount', 'ITRBCnt',
      'ITR_Cat_B', 'ITRCatB', 'CategoryB_ITR', 'Cat_B_ITR',
      'OpenITRB', 'Open_ITR_B', 'OutstandingITRB',
    ]);
    const itrTotal = extractIntField(item, [
      'ITR_Total', 'ITRTotal', 'TotalITR', 'itr_total', 'ITRCount', 'Total_ITR',
      'ITR', 'AllITR', 'TotalITRCount',
    ]) || (itrA + itrB);

    const plA = extractIntField(item, [
      'PunchlistA', 'Punchlist_A', 'PL_A', 'PLA', 'PLACnt', 'PunchA',
      'PunchlistACount', 'Punchlist_A_Count', 'PunchlistAOutstanding',
      'OpenPunchlistA', 'Open_PL_A', 'OutstandingPLA', 'Cat_A_Punch',
      'CategoryA_Punchlist', 'PunchCatA', 'Punch_A',
      'PLAOpen', 'PL_A_Open', 'PunchlistACnt',
    ]);
    const plB = extractIntField(item, [
      'PunchlistB', 'Punchlist_B', 'PL_B', 'PLB', 'PLBCnt', 'PunchB',
      'PunchlistBCount', 'Punchlist_B_Count', 'PunchlistBOutstanding',
      'OpenPunchlistB', 'Open_PL_B', 'OutstandingPLB', 'Cat_B_Punch',
      'CategoryB_Punchlist', 'PunchCatB', 'Punch_B',
      'PLBOpen', 'PL_B_Open', 'PunchlistBCnt',
    ]);

    results.push({
      system_id: sysId,
      name,
      itr_a_count: itrA,
      itr_b_count: itrB,
      itr_total_count: itrTotal,
      punchlist_a_count: plA,
      punchlist_b_count: plB,
      completion_percentage: Math.round(completion),
    });
  }

  return results;
}

function extractIntField(item: any, fieldNames: string[]): number {
  for (const field of fieldNames) {
    const val = item[field];
    if (val !== null && val !== undefined && val !== "") {
      const parsed = parseInt(String(val), 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  }
  return 0;
}

// ─── Resolve ASMX URL (local helper using shared module) ─────

import { resolveAsmxServiceUrl } from "../_shared/gocompletions-auth.ts";

async function fetchSystemsViaAsmx(
  cookies: Record<string, string>,
  gridPageUrl: string,
  gridHtml: string
): Promise<{ rawData: any[]; cookies: Record<string, string> }> {
  const asmxBaseUrl = resolveAsmxServiceUrl(gridHtml, gridPageUrl);
  const origin = new URL(gridPageUrl).origin;
  const parsed = new URL(gridPageUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC";

  const urlsToTry: string[] = [];
  if (asmxBaseUrl) urlsToTry.push(`${asmxBaseUrl}/GetSystems`);
  urlsToTry.push(
    `${origin}/${instanceName}/Controls/CompletionsGrid.asmx/GetSystems`,
    `${origin}/${instanceName}/GoCompletions/Controls/CompletionsGrid.asmx/GetSystems`,
  );

  for (const url of [...new Set(urlsToTry)]) {
    for (const itrClass of ["All", ""]) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Cookie: formatCookies(cookies),
            "User-Agent": BROWSER_UA,
            "X-Requested-With": "XMLHttpRequest",
            Accept: "application/json, text/javascript, */*; q=0.01",
            Referer: gridPageUrl,
            Origin: origin,
          },
          body: JSON.stringify({ itrClass }),
        });

        const text = await response.text();
        cookies = parseCookiesFromResponse(response, cookies);

        if (response.status === 200 && text.length > 50) {
          let data = JSON.parse(text);
          if (data.d !== undefined) {
            data = typeof data.d === "string" ? JSON.parse(data.d) : data.d;
          }
          if (!Array.isArray(data)) {
            for (const key of ["Items", "data", "results", "Systems", "systems", "Data"]) {
              if (data[key] && Array.isArray(data[key])) { data = data[key]; break; }
            }
          }
          if (Array.isArray(data) && data.length > 0) {
            console.log(`SyncCounts: Got ${data.length} systems from ${url}`);
            console.log(`SyncCounts: Available fields: ${Object.keys(data[0]).join(", ")}`);
            console.log(`SyncCounts: Sample item: ${JSON.stringify(data[0]).substring(0, 2000)}`);
            return { rawData: data, cookies };
          }
        }
      } catch (e) {
        console.log(`SyncCounts: ASMX error for ${url}: ${e}`);
      }
    }
  }
  return { rawData: [], cookies };
}

// ─── Fallback: SubSystem picker (Reports/ReportFilters) ──────
// The Sub-Systems lookup modal in GoHub Reports searches ALL subsystems
// in the BGC instance (e.g. C017-DP300-100-01) regardless of project tile.
async function fetchSubSystemsByFilter(
  cookies: Record<string, string>,
  portalUrl: string,
  filterText: string,
): Promise<{ rawData: any[]; cookies: Record<string, string> }> {
  const parsed = new URL(portalUrl);
  const origin = parsed.origin;
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC";

  const candidateUrls = [
    `${origin}/${instanceName}/GoHub/Reports/ReportFilters.aspx/GetSubSystems`,
    `${origin}/${instanceName}/GoHub/Reports/ReportFilters.aspx/SearchSubSystems`,
    `${origin}/${instanceName}/GoHub/Controls/SubSystemPicker.asmx/GetSubSystems`,
    `${origin}/${instanceName}/Controls/SubSystemPicker.asmx/GetSubSystems`,
    `${origin}/${instanceName}/GoHub/Reports/ReportFilters.asmx/GetSubSystems`,
    `${origin}/${instanceName}/GoCompletions/Controls/SubSystemPicker.asmx/GetSubSystems`,
  ];

  const referer = `${origin}/${instanceName}/GoHub/Reports/ReportFilters.aspx`;

  const payloads: Record<string, unknown>[] = [
    { filter: filterText, pageSize: 500, pageNumber: 1 },
    { filter: filterText, pageSize: 500, page: 1 },
    { filter: filterText, PageSize: 500, PageNumber: 1 },
    { searchText: filterText, pageSize: 500, pageNumber: 1 },
    { Filter: filterText, PageSize: 500, PageNumber: 1 },
    { filter: filterText },
  ];

  for (const url of candidateUrls) {
    for (const payload of payloads) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Cookie: formatCookies(cookies),
            "User-Agent": BROWSER_UA,
            "X-Requested-With": "XMLHttpRequest",
            Accept: "application/json, text/javascript, */*; q=0.01",
            Referer: referer,
            Origin: origin,
          },
          body: JSON.stringify(payload),
        });
        const text = await response.text();
        cookies = parseCookiesFromResponse(response, cookies);

        if (response.status !== 200 || text.length < 20) continue;

        let data: any;
        try { data = JSON.parse(text); } catch { continue; }
        if (data?.d !== undefined) {
          data = typeof data.d === "string" ? JSON.parse(data.d) : data.d;
        }
        if (!Array.isArray(data)) {
          for (const key of ["Items", "data", "results", "SubSystems", "Rows", "Data"]) {
            if (data?.[key] && Array.isArray(data[key])) { data = data[key]; break; }
          }
        }
        if (Array.isArray(data) && data.length > 0) {
          console.log(`SyncCounts[picker]: ${data.length} subsystems from ${url} payload=${Object.keys(payload).join(",")}`);
          console.log(`SyncCounts[picker]: sample = ${JSON.stringify(data[0]).substring(0, 500)}`);
          return { rawData: data, cookies };
        }
      } catch (e) {
        // try next combination
      }
    }
  }
  console.log(`SyncCounts[picker]: no endpoint returned subsystems for "${filterText}"`);
  return { rawData: [], cookies };
}

// ─── Main Handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let body: Record<string, unknown> = {};
    try {
      const rawBody = await req.text();
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (_) {
      body = {};
    }

    const { projectFilter, systemIds } = body as {
      projectFilter?: string;
      systemIds?: string[];
    };

    let credentials;
    try {
      credentials = await getGoCompletionsCredentials(adminClient);
    } catch (_) {
      return new Response(
        JSON.stringify({ success: false, error: "GoCompletions credentials are required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { portalUrl: finalPortalUrl, username, password } = credentials;
    const scopeMode = projectFilter ? `filter="${projectFilter}"` : "ALL (no filter)";
    console.log(`SyncCounts: Starting sync — scope=${scopeMode}, systems=${(systemIds || []).length}`);

    // Step 1: Login (using shared module)
    const { cookies: loginCookies, homePageHtml, homePageUrl } =
      await loginGoCompletions(finalPortalUrl, username, password);
    console.log("SyncCounts: Login successful");

    // Step 2: Iterate every project tile the login can see
    const allTiles = extractAllProjectTiles(homePageHtml);
    let currentCookies = loginCookies;
    let allRawData: any[] = [];
    const tileBreakdown: Array<{ name: string; systems_found: number; matched: number; status: 'ok' | 'empty' | 'load_failed' | 'error'; note?: string }> = [];

    if (allTiles.length === 0) {
      const { html: gridHtml, url: gridPageUrl, cookies: gridCookies } =
        await navigateToCompletionsGrid(loginCookies, finalPortalUrl, homePageHtml, homePageUrl);
      const result = await fetchSystemsViaAsmx(gridCookies, gridPageUrl, gridHtml);
      allRawData = result.rawData;
      currentCookies = result.cookies;
      tileBreakdown.push({
        name: "(no tiles — direct grid)",
        systems_found: result.rawData.length,
        matched: result.rawData.length,
        status: result.rawData.length > 0 ? 'ok' : 'empty',
      });
    } else {
      const searchTerms = projectFilter ? buildProjectSearchTerms(projectFilter) : [];

      for (let i = 0; i < allTiles.length; i++) {
        const tile = allTiles[i];
        // FRESH LOGIN PER TILE — GoCompletions binds a session to a single
        // active project tile, so re-using cookies across tiles silently
        // returns the first tile's data (or empty). A fresh session per tile
        // guarantees the postback actually switches project context.
        try {
          const fresh = await loginGoCompletions(finalPortalUrl, username, password);
          let tileCookies = fresh.cookies;
          let tileHomeHtml = fresh.homePageHtml;
          let tileHomeUrl = fresh.homePageUrl;

          // Re-resolve the tile postback against the fresh home page
          const refreshedTiles = extractAllProjectTiles(tileHomeHtml);
          const liveTile = refreshedTiles.find(t => t.name === tile.name) || tile;

          let projectCookies: Record<string, string>;
          let responseHtml: string;
          let responseUrl: string;
          try {
            const sel = await selectProjectTile(tileCookies, tileHomeHtml, tileHomeUrl, liveTile);
            projectCookies = sel.cookies;
            responseHtml = sel.responseHtml;
            responseUrl = sel.responseUrl;
          } catch (selErr) {
            console.log(`SyncCounts: Tile "${tile.name}" — select failed: ${selErr}`);
            tileBreakdown.push({ name: tile.name, systems_found: 0, matched: 0, status: 'load_failed', note: 'tile select failed' });
            continue;
          }

          let gridHtml: string, gridPageUrl: string, gridCookies: Record<string, string>;
          try {
            const grid = await navigateToCompletionsGrid(projectCookies, finalPortalUrl, responseHtml, responseUrl);
            gridHtml = grid.html; gridPageUrl = grid.url; gridCookies = grid.cookies;
          } catch (navErr) {
            console.log(`SyncCounts: Tile "${tile.name}" — grid nav failed: ${navErr}`);
            tileBreakdown.push({ name: tile.name, systems_found: 0, matched: 0, status: 'load_failed', note: 'grid navigation failed' });
            continue;
          }

          const result = await fetchSystemsViaAsmx(gridCookies, gridPageUrl, gridHtml);
          currentCookies = result.cookies;

          // Flatten SubSystem trees so nested systems are searchable
          const flat: any[] = [];
          const walk = (nodes: any[]) => {
            for (const n of nodes || []) {
              if (!n || typeof n !== "object") continue;
              flat.push(n);
              const kids = n.SubSystem || n.SubSystems || n.Children || n.children;
              if (Array.isArray(kids) && kids.length) walk(kids);
            }
          };
          walk(result.rawData);

          let matched: any[];
          if (projectFilter) {
            const matchString = (v: any) =>
              v != null && searchTerms.some((term) => String(v).toUpperCase().includes(term));
            matched = flat.filter((item: any) =>
              matchString(item.Number) ||
              matchString(item.SystemNumber) ||
              matchString(item.Name) ||
              matchString(item.SystemId) ||
              matchString(item.Id) ||
              matchString(item.Description) ||
              matchString(item.SubSystemNumber) ||
              matchString(item.SubSystemName) ||
              matchString(item.SubSystemDescription)
            );
          } else {
            matched = flat;
          }

          // Distinguish "tile loaded but empty" from "tile failed to load"
          const status: 'ok' | 'empty' | 'load_failed' =
            flat.length > 0 ? 'ok' : (result.rawData.length === 0 ? 'load_failed' : 'empty');

          tileBreakdown.push({
            name: tile.name,
            systems_found: flat.length,
            matched: matched.length,
            status,
            note: status === 'load_failed' ? 'ASMX returned no data — tile likely not active' : undefined,
          });
          console.log(`SyncCounts: Tile "${tile.name}" — ${flat.length} nodes, ${matched.length} kept, status=${status}`);

          if (matched.length > 0) allRawData.push(...matched);
        } catch (e) {
          console.log(`SyncCounts: Error in project "${tile.name}": ${e}`);
          tileBreakdown.push({ name: tile.name, systems_found: 0, matched: 0, status: 'error', note: String(e).slice(0, 120) });
        }
      }
    }

    // Fallback only meaningful when a filter was supplied
    if (allRawData.length === 0 && projectFilter) {
      console.log(`SyncCounts: No matches via CompletionsGrid — trying SubSystem picker for "${projectFilter}"`);
      const pickerResult = await fetchSubSystemsByFilter(currentCookies, finalPortalUrl, projectFilter);
      currentCookies = pickerResult.cookies;
      if (pickerResult.rawData.length > 0) {
        const searchTerms = buildProjectSearchTerms(projectFilter);
        const matchString = (v: any) => v != null && searchTerms.some((term) => String(v).toUpperCase().includes(term));
        const matching = pickerResult.rawData.filter((item: any) =>
          matchString(item.SubSystem) || matchString(item.SubSystemNumber) ||
          matchString(item.Number) || matchString(item.Name) ||
          matchString(item.System) || matchString(item.SystemNumber) ||
          matchString(item.Description)
        );
        console.log(`SyncCounts[picker]: ${matching.length}/${pickerResult.rawData.length} match "${projectFilter}"`);
        allRawData = matching.length > 0 ? matching : pickerResult.rawData;
      }
    }

    const tileNames = allTiles.map(t => t.name).filter(Boolean);
    const tilesWithData = tileBreakdown.filter(t => t.matched > 0).map(t => t.name);

    if (allRawData.length === 0) {
      const tileList = tileNames.length ? tileNames.join(", ") : "none";
      const errorMsg = projectFilter
        ? `No systems found matching "${projectFilter}". Scanned ${tileNames.length} tile(s): ${tileList}. The login may not have access to the tile containing this project.`
        : `Login succeeded but no systems were returned from any of ${tileNames.length} tile(s): ${tileList}.`;
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMsg,
          available_projects: tileNames,
          tile_breakdown: tileBreakdown,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const counts = parseSystemCounts(allRawData);
    console.log(`SyncCounts: Parsed counts for ${counts.length} systems`);

    const updatedSystems: string[] = [];
    if (systemIds && Array.isArray(systemIds) && systemIds.length > 0) {
      for (const dbSystemId of systemIds) {
        const match = counts.find(c =>
          c.system_id === dbSystemId ||
          dbSystemId.includes(c.system_id) ||
          c.system_id.includes(dbSystemId)
        );

        if (match) {
          const { error: updateError } = await adminClient
            .from('p2a_systems')
            .update({
              itr_a_count: match.itr_a_count,
              itr_b_count: match.itr_b_count,
              itr_total_count: match.itr_total_count,
              punchlist_a_count: match.punchlist_a_count,
              punchlist_b_count: match.punchlist_b_count,
              completion_percentage: match.completion_percentage,
              updated_at: new Date().toISOString(),
            })
            .eq('system_id', dbSystemId);

          if (!updateError) {
            updatedSystems.push(dbSystemId);
            console.log(`SyncCounts: Updated ${dbSystemId}: ITR-A=${match.itr_a_count}, ITR-B=${match.itr_b_count}, PL-A=${match.punchlist_a_count}, PL-B=${match.punchlist_b_count}`);
          } else {
            console.log(`SyncCounts: Failed to update ${dbSystemId}: ${updateError.message}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        counts,
        updated_systems: updatedSystems,
        total_found: counts.length,
        total_updated: updatedSystems.length,
        scope: projectFilter || null,
        available_projects: tileNames,
        tiles_with_data: tilesWithData,
        tile_breakdown: tileBreakdown,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("SyncCounts error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
