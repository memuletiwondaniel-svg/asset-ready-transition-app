import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  loginGoCompletions,
  extractAllProjectTiles,
  selectProjectTile,
  navigateToCompletionsGrid,
  callAsmxMethod,
  followRedirects,
  formatCookies,
  BROWSER_UA,
  parseCookiesFromResponse,
} from "../_shared/gocompletions-auth.ts";

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

    const body = await req.json();
    const { portalUrl, username, password, projectFilter, systemIds } = body;

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "GoCompletions credentials are required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!projectFilter) {
      return new Response(
        JSON.stringify({ success: false, error: "Project code is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalPortalUrl = portalUrl || "https://goc.gotechnology.online/BGC/GoHub/Home.aspx";
    console.log(`SyncCounts: Starting sync for project=${projectFilter}, systems=${(systemIds || []).length}`);

    // Step 1: Login (using shared module)
    const { cookies: loginCookies, homePageHtml, homePageUrl } =
      await loginGoCompletions(finalPortalUrl, username, password);
    console.log("SyncCounts: Login successful");

    // Step 2: Find matching project tile (using shared module)
    const allTiles = extractAllProjectTiles(homePageHtml);
    let currentCookies = loginCookies;
    let allRawData: any[] = [];

    if (allTiles.length === 0) {
      const { html: gridHtml, url: gridPageUrl, cookies: gridCookies } =
        await navigateToCompletionsGrid(loginCookies, finalPortalUrl, homePageHtml, homePageUrl);
      const result = await fetchSystemsViaAsmx(gridCookies, gridPageUrl, gridHtml);
      allRawData = result.rawData;
      currentCookies = result.cookies;
    } else {
      for (let i = 0; i < allTiles.length; i++) {
        const tile = allTiles[i];
        try {
          let currentHomeHtml = homePageHtml;
          let currentHomeUrl = homePageUrl;

          if (i > 0) {
            const { html, url, cookies: refreshedCookies } = await followRedirects(finalPortalUrl, currentCookies);
            currentCookies = refreshedCookies;
            currentHomeHtml = html;
            currentHomeUrl = url;
            const refreshedTiles = extractAllProjectTiles(currentHomeHtml);
            const matchingTile = refreshedTiles.find(t => t.name === tile.name);
            if (matchingTile) {
              tile.postbackTarget = matchingTile.postbackTarget;
              tile.postbackArgument = matchingTile.postbackArgument;
            }
          }

          const { cookies: projectCookies, responseHtml, responseUrl } =
            await selectProjectTile(currentCookies, currentHomeHtml, currentHomeUrl, tile);

          const { html: gridHtml, url: gridPageUrl, cookies: gridCookies } =
            await navigateToCompletionsGrid(projectCookies, finalPortalUrl, responseHtml, responseUrl);

          const result = await fetchSystemsViaAsmx(gridCookies, gridPageUrl, gridHtml);
          currentCookies = result.cookies;

          if (result.rawData.length > 0) {
            const filterUpper = projectFilter.toUpperCase();
            const matching = result.rawData.filter((item: any) => {
              const id = String(item.Number || item.SystemNumber || item.Name || item.SystemId || item.Id || "");
              return id.toUpperCase().includes(filterUpper);
            });

            if (matching.length > 0) {
              allRawData.push(...matching);
              console.log(`SyncCounts: Found ${matching.length} matching systems in "${tile.name}"`);
            }
          }
        } catch (e) {
          console.log(`SyncCounts: Error in project "${tile.name}": ${e}`);
        }
      }
    }

    if (allRawData.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No systems found matching "${projectFilter}" in GoCompletions`,
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
