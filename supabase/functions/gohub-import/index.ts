import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  navigateToCompletionsGrid,
  resolveAsmxServiceUrl,
  formatCookies,
  parseCookiesFromResponse,
  BROWSER_UA,
  decodeHtmlEntities,
  getGoCompletionsCredentials,
} from "../_shared/gocompletions-auth.ts";
import {
  iterateProjectTilesFreshSession,
  type TileStatus,
} from "../_shared/gohub-tile-iterator.ts";
import {
  buildFilterVariants,
  classifyMatch,
  normalizeId,
  type FilterVariants,
  type MatchTier,
} from "../_shared/gohub-normalize.ts";

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
  match_tier?: "strong" | "weak";
  subsystems: CompletionsSubsystem[];
}

interface SampleEntry {
  source_project: string;
  system_id: string;
  name: string;
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

// ─── Filter variants + confidence tiering ───────────────────
//
// Matching contract (per ORSH spec):
//   GoCompletions system_ids commonly follow [LOCATION]-[PROJECT_ID]-[SYSTEM_NO]
//     e.g. C014-DP18F-622  (CS7 / DP-18F / system 622)
//   but not all ids follow that shape (e.g. N004-A1800 has no DP code).
//
//   Normalization: strip ALL non-alphanumerics and uppercase.
//     "DP-18F" / "DP 18F" / "DP-18-F" / "dp18f"  → "DP18F"
//     "C014-DP18F-622"                            → "C014DP18F622"
//
//   STRONG match: normalized project token (len >= 3) is a substring of
//     the normalized system_id.  "DP18F" ⊂ "C014DP18F622" → STRONG.
//     This is %DP18F% behaviour, applied across the full system list of
//     every searched area — NOT anchored to segment-2 position.
//
//   WEAK match: only a bare digits-only fragment ("18") or a 2-char
//     digits+letter tail matched. These over-match (1800, 218, 18A in
//     unrelated projects) so they are confirmation-only — never auto-selected.

interface FilterVariants {
  raw: string;
  alnum: string;       // "DP18F" — the canonical project token
  digitsTail: string;  // "18F"   — confirmation-only fragment
  digitsOnly: string;  // "18"    — confirmation-only fragment
}

function buildFilterVariantSet(filter: string): FilterVariants {
  const raw = filter.toUpperCase().trim();
  const alnum = raw.replace(/[^A-Z0-9]/g, "");
  const digitsTail = alnum.replace(/^[A-Z]+/, "");
  const digitsOnly = alnum.replace(/[^0-9]/g, "");
  return { raw, alnum, digitsTail, digitsOnly };
}

function normalizeSystemId(id: string): string {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

type MatchTier = "strong" | "weak" | null;

function classifyMatch(systemId: string, v: FilterVariants): MatchTier {
  const norm = normalizeSystemId(systemId);
  // STRONG: full normalized project token embedded anywhere in the id.
  if (v.alnum && v.alnum.length >= 3 && norm.includes(v.alnum)) return "strong";
  // WEAK: only a bare fragment matches — over-matches, confirmation-only.
  if (v.digitsTail && v.digitsTail.length >= 2 && norm.includes(v.digitsTail)) return "weak";
  if (v.digitsOnly && v.digitsOnly.length >= 2 && norm.includes(v.digitsOnly)) return "weak";
  return null;
}

// ─── Fetch every system for an already-loaded grid (no tile select) ──

async function fetchAllSystemsFromGrid(
  cookies: Record<string, string>,
  gridPageUrl: string,
  gridHtml: string,
): Promise<CompletionsSystem[]> {
  let systems = await tryAsmxWebMethod(cookies, gridPageUrl, gridHtml);
  if (systems.length === 0) systems = await tryPageMethod(cookies, gridPageUrl);
  if (systems.length === 0) systems = extractFromHtml(gridHtml);

  if (systems.length > 0) {
    const needsEnrichment = systems.some((s) => s.subsystems.length === 0);
    if (needsEnrichment) {
      systems = await enrichSystemsWithSubsystems(systems, cookies, gridPageUrl, gridHtml);
    }
  }
  return systems;
}

function matchSystems(
  systems: CompletionsSystem[],
  variants: FilterVariants,
  sourceProject: string,
): CompletionsSystem[] {
  const matched: CompletionsSystem[] = [];
  for (const sys of systems) {
    const tier = classifyMatch(sys.system_id, variants);
    if (!tier) continue;
    sys.match_tier = tier;
    sys.source_project = sourceProject;
    matched.push(sys);
  }
  return matched;
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

    let body: Record<string, unknown> = {};
    try {
      const rawBody = await req.text();
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (_) {
      body = {};
    }
    const { projectFilter } = body as { projectFilter?: string };

    if (!projectFilter) {
      return new Response(
        JSON.stringify({ success: false, error: "Project code is required for GoHub import." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let credentials;
    try {
      credentials = await getGoCompletionsCredentials();
    } catch (_) {
      return new Response(
        JSON.stringify({ success: false, error: "GoHub credentials required", setup_required: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { portalUrl: finalPortalUrl, username, password } = credentials;

    console.log(`GoHub import: portal=${finalPortalUrl}, filter=${projectFilter}`);

    const variants = buildFilterVariantSet(projectFilter);
    const sampleSink = { entries: [] as SampleEntry[] };

    const toCandidate = (sys: CompletionsSystem, idx: number) => ({
      id: `gohub-${Date.now()}-${idx}`,
      system_id: sys.system_id,
      name: sys.name,
      description: sys.description,
      is_hydrocarbon: sys.is_hydrocarbon,
      progress: sys.progress,
      subsystems: sys.subsystems || [],
      source: "gohub",
      source_project: sys.source_project,
      tier: sys.match_tier || "weak",
    });

    // ── Iterate every tile with a FRESH login per tile (shared helper).
    // Same iteration used by gohub-sync-counts so the two cannot diverge.
    const iteration = await iterateProjectTilesFreshSession<CompletionsSystem[]>(
      finalPortalUrl,
      username,
      password,
      async ({ tile, cookies, gridPageUrl, gridHtml }) => {
        const systems = await fetchAllSystemsFromGrid(cookies, gridPageUrl, gridHtml);

        // Collect a sample so the UI can offer a manual pick-list when no matches
        for (const s of systems) {
          if (sampleSink.entries.length >= 200) break;
          sampleSink.entries.push({
            source_project: tile.name,
            system_id: s.system_id,
            name: s.name,
          });
        }

        if (systems.length === 0) {
          return { result: [], status: "load_failed" as const };
        }
        console.log(
          `GoHub[${tile.name}]: ${systems.length} systems found. variants=${JSON.stringify(variants)} sample=${systems.slice(0, 5).map((s) => s.system_id).join(",")}`,
        );
        const matched = matchSystems(systems, variants, tile.name);
        return { result: matched, status: "ok" as const };
      },
      { logPrefix: "GoHubImport" },
    );

    const allTiles = iteration.tiles;

    if (allTiles.length === 0) {
      console.log("GoHub: No project tiles found. Attempting direct grid access...");
      try {
        const { html: gridHtml, url: gridPageUrl, cookies: gridCookies } =
          await navigateToCompletionsGrid(
            iteration.initialCookies,
            finalPortalUrl,
            iteration.homePageHtml,
            iteration.homePageUrl,
          );

        const systems = await fetchAllSystemsFromGrid(gridCookies, gridPageUrl, gridHtml);
        for (const s of systems) {
          if (sampleSink.entries.length >= 200) break;
          sampleSink.entries.push({ source_project: "direct", system_id: s.system_id, name: s.name });
        }
        const matched = matchSystems(systems, variants, "direct");
        const topLevel = inferHierarchy(matched);
        const candidates = topLevel.map(toCandidate);

        return new Response(
          JSON.stringify({
            success: true,
            candidates,
            sample: sampleSink.entries.slice(0, 60),
            project_filter: projectFilter,
            variants,
            searched_projects: ["direct"],
            tile_breakdown: [{ name: "direct", status: systems.length > 0 ? "ok" : "load_failed", systems_found: systems.length, matched: matched.length }],
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.log(`GoHub: Direct grid access fallback failed: ${e}`);
      }

      throw new Error("No project tiles found on the GoHub home page.");
    }

    // Aggregate matched systems and per-tile diagnostics
    console.log(`GoHub: Searched ${allTiles.length} tiles for "${projectFilter}" (variants=${JSON.stringify(variants)})`);
    const allMatchingSystems: CompletionsSystem[] = [];
    const searchedProjects: string[] = iteration.outcomes.map((o) => o.name);
    const projectsWithResults: string[] = [];
    const tileBreakdown = iteration.outcomes.map((o) => {
      const matchedHere = o.result?.length || 0;
      if (matchedHere > 0) {
        projectsWithResults.push(o.name);
        allMatchingSystems.push(...(o.result || []));
      }
      return {
        name: o.name,
        status: o.status as TileStatus,
        note: o.note,
        matched: matchedHere,
      };
    });

    // Deduplicate matches by system_id (keep strongest tier)
    const dedupMap = new Map<string, CompletionsSystem>();
    for (const sys of allMatchingSystems) {
      const existing = dedupMap.get(sys.system_id);
      if (!existing) { dedupMap.set(sys.system_id, sys); continue; }
      if (existing.match_tier !== "strong" && sys.match_tier === "strong") {
        dedupMap.set(sys.system_id, sys);
      }
    }
    const uniqueSystems = [...dedupMap.values()];

    const topLevel = inferHierarchy(uniqueSystems);
    const candidates = topLevel.map(toCandidate);

    // Tiles that genuinely failed to switch (vs. legitimately empty/no-match)
    const failedTiles = tileBreakdown.filter((t) => t.status === "load_failed" || t.status === "error");

    return new Response(
      JSON.stringify({
        success: true,
        candidates,
        sample: sampleSink.entries.slice(0, 60),
        project_filter: projectFilter,
        variants,
        searched_projects: searchedProjects,
        projects_with_results: projectsWithResults,
        tile_breakdown: tileBreakdown,
        failed_tiles: failedTiles.map((t) => t.name),
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
