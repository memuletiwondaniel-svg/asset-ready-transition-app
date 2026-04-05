import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  loginGoCompletions,
  extractAllProjectTiles,
  selectProjectTile,
  navigateToCompletionsGrid,
  resolveAsmxServiceUrl,
  followRedirects,
  formatCookies,
  parseCookiesFromResponse,
  BROWSER_UA,
  decodeHtmlEntities,
  type ProjectTile,
} from "../_shared/gocompletions-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Data Types ─────────────────────────────────────────────

interface CompletionsSubsystem {
  system_id: string;
  name: string;
  progress: number;
}

interface CompletionsSystem {
  system_id: string;
  name: string;
  description: string;
  progress: number;
  is_hydrocarbon: boolean;
  source_project?: string;
  subsystems: CompletionsSubsystem[];
}

// ─── Strategy 1: ASMX WebMethod ─────────────────────────────

async function tryAsmxWebMethod(
  cookies: Record<string, string>,
  gridPageUrl: string,
  gridHtml: string
): Promise<CompletionsSystem[]> {
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
          const systems = parsePageMethodResponse(text);
          if (systems.length > 0) {
            console.log(`GoHub: ASMX WebMethod returned ${systems.length} systems!`);
            return systems;
          }
        }
      } catch (e) {
        console.log(`GoHub: ASMX WebMethod error for ${url}: ${e}`);
      }
    }
  }
  return [];
}

// ─── Fetch subsystems for each system via ASMX GetSubSystems ─

async function enrichSystemsWithSubsystems(
  systems: CompletionsSystem[],
  cookies: Record<string, string>,
  gridPageUrl: string,
  gridHtml: string,
): Promise<CompletionsSystem[]> {
  const systemsToEnrich = systems.filter(s => s.subsystems.length === 0);
  if (systemsToEnrich.length === 0) return systems;

  const asmxBaseUrl = resolveAsmxServiceUrl(gridHtml, gridPageUrl);
  const origin = new URL(gridPageUrl).origin;
  const parsed = new URL(gridPageUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC";

  const urlsToTry: string[] = [];
  if (asmxBaseUrl) urlsToTry.push(`${asmxBaseUrl}/GetSubSystems`);
  urlsToTry.push(
    `${origin}/${instanceName}/Controls/CompletionsGrid.asmx/GetSubSystems`,
    `${origin}/${instanceName}/GoCompletions/Controls/CompletionsGrid.asmx/GetSubSystems`,
  );

  let workingUrl: string | null = null;
  const testSystem = systemsToEnrich[0];

  for (const url of [...new Set(urlsToTry)]) {
    try {
      const paramVariants = [
        { systemNumber: testSystem.system_id },
        { systemId: testSystem.system_id },
        { number: testSystem.system_id },
        { System: testSystem.system_id },
        { itrClass: "All", systemNumber: testSystem.system_id },
      ];

      for (const params of paramVariants) {
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
          body: JSON.stringify(params),
        });

        const text = await response.text();
        if (response.status === 200 && text.length > 10) {
          try {
            let parsedData = JSON.parse(text);
            if (parsedData.d !== undefined) {
              parsedData = typeof parsedData.d === "string" ? JSON.parse(parsedData.d) : parsedData.d;
            }
            if (!Array.isArray(parsedData)) {
              for (const key of ["Items", "data", "results", "Systems", "systems", "Data"]) {
                if (parsedData[key] && Array.isArray(parsedData[key])) { parsedData = parsedData[key]; break; }
              }
            }
            if (Array.isArray(parsedData) && parsedData.length > 0) {
              workingUrl = url;
              testSystem.subsystems = parseSubsystemsResponse(parsedData);
              break;
            }
          } catch (_) { /* not valid JSON */ }
        }
      }
      if (workingUrl) break;
    } catch (e) {
      console.log(`GoHub: GetSubSystems error for ${url}: ${e}`);
    }
  }

  if (!workingUrl) {
    console.log("GoHub: GetSubSystems endpoint not available");
    return systems;
  }

  const remaining = systemsToEnrich.filter(s => s !== testSystem);
  const BATCH_SIZE = 5;
  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (system) => {
      try {
        const response = await fetch(workingUrl!, {
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
          body: JSON.stringify({ systemNumber: system.system_id }),
        });

        if (response.status === 200) {
          const text = await response.text();
          try {
            let parsedData = JSON.parse(text);
            if (parsedData.d !== undefined) {
              parsedData = typeof parsedData.d === "string" ? JSON.parse(parsedData.d) : parsedData.d;
            }
            if (!Array.isArray(parsedData)) {
              for (const key of ["Items", "data", "results", "Systems", "systems", "Data"]) {
                if (parsedData[key] && Array.isArray(parsedData[key])) { parsedData = parsedData[key]; break; }
              }
            }
            if (Array.isArray(parsedData)) {
              system.subsystems = parseSubsystemsResponse(parsedData);
            }
          } catch (_) { /* skip */ }
        }
      } catch (_) { /* skip */ }
    }));
  }

  return systems;
}

function parseSubsystemsResponse(data: any[]): CompletionsSubsystem[] {
  const subsystems: CompletionsSubsystem[] = [];
  for (const sub of data) {
    if (!sub || typeof sub !== "object") continue;
    const subId = String(
      sub.Number || sub.SystemNumber || sub.SubSystemNumber || sub.Name ||
      sub.SubSystemName || sub.SystemId || sub.system_id || sub.Id || sub.CODE || ""
    );
    if (!subId) continue;
    const subName = String(
      sub.Description || sub.SystemDescription || sub.SubSystemDescription ||
      sub.Title || sub.NAME || subId
    );
    let subProgress = 0;
    const pctValue = sub.Complete ?? sub.Progress ?? sub.OverallProgress ??
      sub.Percent ?? sub.CompletionPercent ?? sub.percentage ?? null;
    if (pctValue !== null && pctValue !== undefined) {
      const parsed = parseFloat(String(pctValue).replace("%", ""));
      if (!isNaN(parsed)) {
        subProgress = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
      }
    }
    subsystems.push({ system_id: subId, name: subName, progress: subProgress });
  }
  return subsystems;
}

// ─── Strategy 2: ASP.NET PageMethod ─────────────────────────

async function tryPageMethod(
  cookies: Record<string, string>,
  gridPageUrl: string
): Promise<CompletionsSystem[]> {
  const pageMethodUrl = gridPageUrl.replace(/\?.*$/, "") + "/GetSystems";
  try {
    const response = await fetch(pageMethodUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Cookie: formatCookies(cookies),
        "User-Agent": BROWSER_UA,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01",
        Referer: gridPageUrl,
        Origin: new URL(gridPageUrl).origin,
      },
      body: JSON.stringify({ itrClass: "All" }),
    });

    const text = await response.text();
    if (response.status === 200 && text.length > 50) {
      const systems = parsePageMethodResponse(text);
      if (systems.length > 0) return systems;
    }
  } catch (e) {
    console.log(`GoHub: PageMethod error: ${e}`);
  }
  return [];
}

// ─── Strategy 3: Extract data from HTML ─────────────────────

function extractFromHtml(gridHtml: string): CompletionsSystem[] {
  const systems: CompletionsSystem[] = [];
  const seen = new Set<string>();

  const cleanHtml = gridHtml
    .replace(/<input[^>]*type=["']hidden["'][^>]*>/gi, "")
    .replace(/\s+/g, " ");

  const gtItemPattern = /<div[^>]*class=["'][^"']*gt-item[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let itemMatch;
  while ((itemMatch = gtItemPattern.exec(cleanHtml)) !== null) {
    const content = itemMatch[1];
    const sysMatch = content.match(/([A-Z0-9][\w.-]{2,30})/);
    const pctMatch = content.match(/([\d.]+)\s*%/);
    if (sysMatch && !seen.has(sysMatch[1])) {
      seen.add(sysMatch[1]);
      systems.push({
        system_id: sysMatch[1],
        name: sysMatch[1],
        description: "Imported from GoCompletions",
        progress: pctMatch ? parseFloat(pctMatch[1]) : 0,
        is_hydrocarbon: false,
        subsystems: [],
      });
    }
  }

  const sysIdPatterns = [
    /\b(DP\d{2,4}[-_][A-Z0-9]{2,}[-_][A-Z0-9-]+)\b/gi,
    /\b([A-Z]{1,4}\d{2,4}[-_][A-Z0-9]{2,}[-_]\d{2,})\b/gi,
  ];

  for (const pattern of sysIdPatterns) {
    let match;
    while ((match = pattern.exec(cleanHtml)) !== null) {
      const sysId = match[1];
      if (seen.has(sysId)) continue;
      seen.add(sysId);

      const afterIdx = match.index + sysId.length;
      const context = cleanHtml.substring(afterIdx, afterIdx + 300);
      let progress = 0;
      const pctMatch = context.match(/([\d.]+)\s*%/);
      if (pctMatch) {
        const val = parseFloat(pctMatch[1]);
        if (val >= 0 && val <= 100) progress = val;
      }

      systems.push({
        system_id: sysId,
        name: sysId,
        description: "Imported from GoCompletions",
        progress,
        is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon|flare)\b/i.test(sysId),
        subsystems: [],
      });
    }
  }

  return systems;
}

// ─── Response Parser ────────────────────────────────────────

function parsePageMethodResponse(text: string): CompletionsSystem[] {
  const systems: CompletionsSystem[] = [];
  const seen = new Set<string>();

  try {
    let data = JSON.parse(text);
    if (data.d !== undefined) {
      data = typeof data.d === "string" ? JSON.parse(data.d) : data.d;
    }
    if (!Array.isArray(data)) {
      for (const key of ["Items", "data", "results", "Systems", "systems", "Data"]) {
        if (data[key] && Array.isArray(data[key])) { data = data[key]; break; }
      }
    }
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch (_) { /* not JSON */ }
    }

    if (Array.isArray(data)) {
      for (const item of data) {
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

        let progress = 0;
        const pctValue = item.Complete ?? item.Progress ?? item.OverallProgress ??
          item.Percent ?? item.CompletionPercent ?? item.percentage ?? null;
        if (pctValue !== null && pctValue !== undefined) {
          const parsed = parseFloat(String(pctValue).replace('%', ''));
          if (!isNaN(parsed)) {
            progress = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
          }
        }

        let rawSubSystems = item.SubSystem ?? item.SubSystems ?? item.subsystems ?? item.Children ?? [];
        const parsedSubsystems: CompletionsSubsystem[] = [];

        if (typeof rawSubSystems === 'string') {
          try { rawSubSystems = JSON.parse(rawSubSystems); } catch (_) { rawSubSystems = []; }
        }
        if (rawSubSystems && typeof rawSubSystems === 'object' && !Array.isArray(rawSubSystems)) {
          for (const key of ['Items', 'data', 'results', 'd', 'SubSystems', 'Children']) {
            if (Array.isArray(rawSubSystems[key])) { rawSubSystems = rawSubSystems[key]; break; }
          }
          if (!Array.isArray(rawSubSystems) && rawSubSystems.Number) {
            rawSubSystems = [rawSubSystems];
          }
        }

        if (Array.isArray(rawSubSystems)) {
          for (const sub of rawSubSystems) {
            if (!sub || typeof sub !== 'object') continue;
            const subId = String(
              sub.Number || sub.SystemNumber || sub.Name || sub.SubSystemName ||
              sub.SystemId || sub.system_id || sub.Id || sub.CODE || ""
            );
            if (!subId) continue;
            const subName = String(
              sub.Description || sub.SystemDescription || sub.SubSystemDescription ||
              sub.Title || sub.NAME || subId
            );
            let subProgress = 0;
            const subPctValue = sub.Complete ?? sub.Progress ?? sub.OverallProgress ??
              sub.Percent ?? sub.CompletionPercent ?? sub.percentage ?? null;
            if (subPctValue !== null && subPctValue !== undefined) {
              const p = parseFloat(String(subPctValue).replace('%', ''));
              if (!isNaN(p)) subProgress = p > 0 && p <= 1 ? p * 100 : p;
            }
            parsedSubsystems.push({ system_id: subId, name: subName, progress: subProgress });
          }
        }

        systems.push({
          system_id: sysId,
          name,
          description: `Imported from GoCompletions${parsedSubsystems.length ? ` (${parsedSubsystems.length} subsystems)` : ""}`,
          progress,
          is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon|flare)\b/i.test(name + " " + sysId),
          subsystems: parsedSubsystems,
        });
      }
      return systems;
    }
  } catch (e) {
    console.log(`GoHub: JSON parse error: ${e}`);
  }

  // Fallback: regex extraction from raw text
  const sysIdPattern = /\b([A-Z]{1,4}\d{2,4}[-_][A-Z0-9]{2,}[-_][A-Z0-9-]+)\b/g;
  let match;
  while ((match = sysIdPattern.exec(text)) !== null) {
    const sysId = match[1];
    if (seen.has(sysId)) continue;
    seen.add(sysId);
    const afterIdx = match.index + sysId.length;
    const context = text.substring(afterIdx, afterIdx + 500);
    let progress = 0;
    const pctMatch = context.match(/([\d.]+)\s*%/);
    if (pctMatch) {
      const val = parseFloat(pctMatch[1]);
      if (val >= 0 && val <= 100) progress = val;
    }
    systems.push({
      system_id: sysId,
      name: sysId,
      description: "Imported from GoCompletions",
      progress,
      is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon|flare)\b/i.test(sysId),
      subsystems: [],
    });
  }

  return systems;
}

// ─── Search a single project for matching systems ───────────

async function searchProjectForSystems(
  cookies: Record<string, string>,
  homePageHtml: string,
  homePageUrl: string,
  portalUrl: string,
  tile: ProjectTile,
  projectFilter: string
): Promise<{ systems: CompletionsSystem[]; cookies: Record<string, string> }> {
  try {
    const { cookies: projectCookies, responseHtml, responseUrl } =
      await selectProjectTile(cookies, homePageHtml, homePageUrl, tile);

    const { html: gridHtml, url: gridPageUrl, cookies: gridCookies } =
      await navigateToCompletionsGrid(projectCookies, portalUrl, responseHtml, responseUrl);

    let allSystems: CompletionsSystem[] = [];
    allSystems = await tryAsmxWebMethod(gridCookies, gridPageUrl, gridHtml);
    if (allSystems.length === 0) allSystems = await tryPageMethod(gridCookies, gridPageUrl);
    if (allSystems.length === 0) allSystems = extractFromHtml(gridHtml);

    if (allSystems.length > 0) {
      const needsEnrichment = allSystems.some(s => s.subsystems.length === 0);
      if (needsEnrichment) {
        allSystems = await enrichSystemsWithSubsystems(allSystems, gridCookies, gridPageUrl, gridHtml);
      }
    }

    if (allSystems.length > 0 && projectFilter) {
      const filterUpper = projectFilter.toUpperCase();
      const filtered = allSystems.filter(s => s.system_id.toUpperCase().includes(filterUpper));
      for (const sys of filtered) sys.source_project = tile.name;
      return { systems: filtered, cookies: gridCookies };
    }

    return { systems: [], cookies: gridCookies };
  } catch (error) {
    console.error(`GoHub: Error searching project "${tile.name}":`, error);
    return { systems: [], cookies };
  }
}

// ─── Hierarchy inference ────────────────────────────────────

function inferHierarchy(systems: CompletionsSystem[]): CompletionsSystem[] {
  const sorted = [...systems].sort(
    (a, b) => a.system_id.length - b.system_id.length || a.system_id.localeCompare(b.system_id)
  );

  const parentMap = new Map<string, CompletionsSystem>();
  const childIds = new Set<string>();

  for (const sys of sorted) {
    let foundParent = false;
    for (const [parentId, parent] of parentMap) {
      if (
        sys.system_id.length > parentId.length &&
        sys.system_id.startsWith(parentId) &&
        /[-_.]/.test(sys.system_id.charAt(parentId.length))
      ) {
        parent.subsystems.push({
          system_id: sys.system_id,
          name: sys.name,
          progress: sys.progress,
        });
        childIds.add(sys.system_id);
        foundParent = true;
        break;
      }
    }
    if (!foundParent) parentMap.set(sys.system_id, sys);
  }

  return systems.filter(s => !childIds.has(s.system_id));
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { portalUrl, username, password, projectFilter } = body;

    if (!projectFilter) {
      return new Response(
        JSON.stringify({ success: false, error: "Project code is required for GoHub import." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalPortalUrl = portalUrl || "https://goc.gotechnology.online/BGC/GoHub/Home.aspx";

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "GoHub credentials required", setup_required: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`GoHub import: portal=${finalPortalUrl}, filter=${projectFilter}`);

    // Step 1: Login (shared module)
    const { cookies: loginCookies, homePageHtml, homePageUrl } =
      await loginGoCompletions(finalPortalUrl, username, password);
    console.log("GoHub: Login successful");

    // Step 2: Extract project tiles (shared module)
    const allTiles = extractAllProjectTiles(homePageHtml);

    if (allTiles.length === 0) {
      console.log("GoHub: No project tiles found. Attempting direct grid access...");
      try {
        const { html: gridHtml, url: gridPageUrl, cookies: gridCookies } =
          await navigateToCompletionsGrid(loginCookies, finalPortalUrl, homePageHtml, homePageUrl);

        let systems = await tryAsmxWebMethod(gridCookies, gridPageUrl, gridHtml);
        if (systems.length === 0) systems = await tryPageMethod(gridCookies, gridPageUrl);
        if (systems.length === 0) systems = extractFromHtml(gridHtml);

        const filterUpper = projectFilter.toUpperCase();
        const filtered = systems.filter(s => s.system_id.toUpperCase().includes(filterUpper));

        if (filtered.length > 0) {
          const topLevel = inferHierarchy(filtered);
          const result = topLevel.map((sys, index) => ({
            id: `gohub-${Date.now()}-${index}`,
            system_id: sys.system_id,
            name: sys.name,
            description: sys.description,
            is_hydrocarbon: sys.is_hydrocarbon,
            progress: sys.progress,
            subsystems: sys.subsystems || [],
            source: "gohub",
          }));

          return new Response(
            JSON.stringify({ success: true, systems: result, total: result.length, project_filter: projectFilter, searched_projects: ["direct"] }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.log(`GoHub: Direct grid access fallback failed: ${e}`);
      }

      throw new Error("No project tiles found on the GoHub home page.");
    }

    // Step 3: Search ALL projects
    console.log(`GoHub: Will search ${allTiles.length} projects for systems matching "${projectFilter}"`);
    const allMatchingSystems: CompletionsSystem[] = [];
    const searchedProjects: string[] = [];
    const projectsWithResults: string[] = [];
    let currentCookies = loginCookies;

    for (let i = 0; i < allTiles.length; i++) {
      const tile = allTiles[i];
      searchedProjects.push(tile.name);

      let currentHomeHtml = homePageHtml;
      let currentHomeUrl = homePageUrl;

      if (i > 0) {
        try {
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
        } catch (e) {
          console.log(`GoHub: Could not refresh home page for project ${tile.name}: ${e}`);
        }
      }

      const { systems: matchedSystems, cookies: updatedCookies } = await searchProjectForSystems(
        currentCookies, currentHomeHtml, currentHomeUrl, finalPortalUrl, tile, projectFilter
      );
      currentCookies = updatedCookies;

      if (matchedSystems.length > 0) {
        allMatchingSystems.push(...matchedSystems);
        projectsWithResults.push(tile.name);
      }
    }

    if (allMatchingSystems.length === 0) {
      throw new Error(
        `No systems matching "${projectFilter}" found across ${searchedProjects.length} GoHub projects (${searchedProjects.join(", ")}).`
      );
    }

    // Deduplicate
    const seen = new Set<string>();
    const uniqueSystems = allMatchingSystems.filter(sys => {
      if (seen.has(sys.system_id)) return false;
      seen.add(sys.system_id);
      return true;
    });

    // Infer hierarchy
    const topLevel = inferHierarchy(uniqueSystems);

    const result = topLevel.map((sys, index) => ({
      id: `gohub-${Date.now()}-${index}`,
      system_id: sys.system_id,
      name: sys.name,
      description: sys.description,
      is_hydrocarbon: sys.is_hydrocarbon,
      progress: sys.progress,
      subsystems: sys.subsystems || [],
      source: "gohub",
    }));

    return new Response(
      JSON.stringify({
        success: true,
        systems: result,
        total: result.length,
        project_filter: projectFilter,
        searched_projects: searchedProjects,
        projects_with_results: projectsWithResults,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("GoHub import error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
