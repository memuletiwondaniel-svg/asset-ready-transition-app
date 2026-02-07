import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Cookie Utilities ────────────────────────────────────────

function parseCookiesFromResponse(
  response: Response,
  existing: Record<string, string> = {}
): Record<string, string> {
  const cookies = { ...existing };
  try {
    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];
    for (const header of setCookies) {
      const [nameValue] = header.split(";");
      const eqIndex = nameValue.indexOf("=");
      if (eqIndex > 0) {
        cookies[nameValue.substring(0, eqIndex).trim()] =
          nameValue.substring(eqIndex + 1).trim();
      }
    }
  } catch (_) {
    const combined = response.headers.get("set-cookie");
    if (combined) {
      const [nameValue] = combined.split(";");
      const eqIndex = nameValue.indexOf("=");
      if (eqIndex > 0) {
        cookies[nameValue.substring(0, eqIndex).trim()] =
          nameValue.substring(eqIndex + 1).trim();
      }
    }
  }
  return cookies;
}

function formatCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

// ─── HTML Parsing Utilities ──────────────────────────────────

function extractHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const regex = /<input[^>]*type=["']hidden["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const tag = match[0];
    const nameMatch = tag.match(/name=["']([^"']*?)["']/);
    const valueMatch = tag.match(/value=["']([^"']*?)["']/);
    if (nameMatch) {
      fields[nameMatch[1]] = valueMatch
        ? valueMatch[1].replace(/&amp;/g, "&")
        : "";
    }
  }
  return fields;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── Step 1: ASP.NET Web Login ──────────────────────────────

async function webLogin(
  portalUrl: string,
  username: string,
  password: string
): Promise<Record<string, string>> {
  console.log("GoHub Auth: Starting web login...");
  let cookies: Record<string, string> = {};

  let url = portalUrl;
  let loginPageHtml = "";
  let loginPageUrl = "";

  for (let i = 0; i < 10; i++) {
    console.log(`GoHub Auth: Redirect ${i + 1}: GET ${url.substring(0, 120)}`);
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        Cookie: formatCookies(cookies),
        Accept: "text/html",
        "User-Agent": BROWSER_UA,
      },
    });
    cookies = parseCookiesFromResponse(response, cookies);
    const location = response.headers.get("location");

    if (location) {
      await response.text();
      url = new URL(location, url).toString();
      continue;
    }
    loginPageHtml = await response.text();
    loginPageUrl = url;
    break;
  }

  if (!loginPageHtml) {
    throw new Error("Could not reach the GoHub login page");
  }

  console.log(
    `GoHub Auth: Login page at ${loginPageUrl.substring(0, 80)}, size=${loginPageHtml.length}`
  );

  const hiddenFields = extractHiddenFields(loginPageHtml);

  let userField = "ApplicationLogin$UserName";
  let passField = "ApplicationLogin$Password";
  let buttonField = "ApplicationLogin$LoginButton";
  let buttonValue = "Log In";

  const userInputMatch = loginPageHtml.match(/name=["']([\w$]+UserName[\w$]*)["']/i);
  const passInputMatch = loginPageHtml.match(/name=["']([\w$]+Password[\w$]*)["']/i);
  const buttonMatch = loginPageHtml.match(/name=["']([\w$]+Login\w*Button[\w$]*)["'][^>]*value=["']([^"']*)["']/i);

  if (userInputMatch) userField = userInputMatch[1];
  if (passInputMatch) passField = passInputMatch[1];
  if (buttonMatch) {
    buttonField = buttonMatch[1];
    buttonValue = buttonMatch[2];
  }

  const actionMatch = loginPageHtml.match(/<form[^>]*action=["']([^"']*?)["'][^>]*>/i);
  const formAction = actionMatch
    ? new URL(actionMatch[1].replace(/&amp;/g, "&"), loginPageUrl).toString()
    : loginPageUrl;

  const formData: Record<string, string> = {
    ...hiddenFields,
    [userField]: username,
    [passField]: password,
    [buttonField]: buttonValue,
  };

  console.log(`GoHub Auth: Submitting login...`);

  const loginResponse = await fetch(formAction, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: formatCookies(cookies),
      "User-Agent": BROWSER_UA,
      Referer: loginPageUrl,
      Origin: new URL(loginPageUrl).origin,
    },
    body: new URLSearchParams(formData).toString(),
  });

  cookies = parseCookiesFromResponse(loginResponse, cookies);
  const postLocation = loginResponse.headers.get("location");

  if (!postLocation) {
    const responseHtml = await loginResponse.text();
    const errorMsgMatch = responseHtml.match(/class=["']ErrorMessage["'][^>]*>\s*([^<]+)/i);
    if (errorMsgMatch && errorMsgMatch[1].trim()) {
      throw new Error(`Login failed: ${errorMsgMatch[1].trim()}`);
    }
    if (responseHtml.includes("ApplicationLogin") || responseHtml.includes("Login to")) {
      throw new Error("Login failed: Invalid username or password.");
    }
  } else {
    await loginResponse.text();
  }

  // Follow redirect chain
  if (postLocation) {
    url = new URL(postLocation, formAction).toString();
    for (let i = 0; i < 10; i++) {
      const response = await fetch(url, {
        redirect: "manual",
        headers: {
          Cookie: formatCookies(cookies),
          Accept: "text/html",
          "User-Agent": BROWSER_UA,
        },
      });
      cookies = parseCookiesFromResponse(response, cookies);
      const location = response.headers.get("location");
      await response.text();
      if (!location) break;
      url = new URL(location, url).toString();
    }
  }

  console.log(`GoHub Auth: Login complete, cookies: ${Object.keys(cookies).join(", ")}`);
  return cookies;
}

// ─── Step 2: Discover Level IDs ──────────────────────────────
// GoHub requires X-GoTechnology-Level header for API calls.
// After login, we need to discover available levels from the home page.
// Returns an array of candidate level IDs (best guesses first).

async function discoverLevelIds(
  cookies: Record<string, string>,
  origin: string,
  instanceName: string
): Promise<string[]> {
  const candidates: string[] = [];

  // Strategy 1: Try the Level API directly
  const levelApiUrls = [
    `${origin}/${instanceName}/api/Level`,
    `${origin}/${instanceName}/api/UserLevel`,
    `${origin}/${instanceName}/api/Project`,
  ];

  for (const levelUrl of levelApiUrls) {
    try {
      console.log(`GoHub Level: Trying ${levelUrl}`);
      const response = await fetch(levelUrl, {
        headers: {
          Cookie: formatCookies(cookies),
          Accept: "application/json",
          "User-Agent": BROWSER_UA,
        },
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("json")) {
          const data = await response.json();
          console.log(`GoHub Level: Got response from ${levelUrl}: ${JSON.stringify(data).substring(0, 500)}`);

          const items = Array.isArray(data) ? data : data.Items || data.levels || [];
          if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
              const id = String(item.ID || item.Id || item.id || "");
              console.log(`GoHub Level: Found: ID=${id}, Name=${item.Name || item.name}`);
              if (id) candidates.push(id);
            }
          }
        } else {
          await response.text();
        }
      } else {
        const text = await response.text();
        console.log(`GoHub Level: ${levelUrl} returned ${response.status}: ${text.substring(0, 100)}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`GoHub Level: ${levelUrl} error: ${msg}`);
    }
  }

  if (candidates.length > 0) return candidates;

  // Strategy 2: Parse the home page for level/project info
  try {
    const homeUrl = `${origin}/${instanceName}/GoHub/Home.aspx`;
    console.log(`GoHub Level: Checking home page ${homeUrl}`);
    const response = await fetch(homeUrl, {
      headers: {
        Cookie: formatCookies(cookies),
        Accept: "text/html",
        "User-Agent": BROWSER_UA,
      },
    });

    if (response.ok) {
      const html = await response.text();

      // Look for level ID in JavaScript variables, hidden fields, or data attributes
      const patterns = [
        /levelId["']?\s*[:=]\s*["']([a-f0-9-]{36})["']/i,
        /LevelId["']?\s*[:=]\s*["']([a-f0-9-]{36})["']/i,
        /level[-_]?id["']?\s*[:=]\s*["']([a-f0-9-]{36})["']/i,
        /X-GoTechnology-Level["']?\s*[:=]\s*["']([a-f0-9-]{36})["']/i,
        /selectedLevel["']?\s*[:=]\s*["']([a-f0-9-]{36})["']/i,
        /currentLevel["']?\s*[:=]\s*["']([a-f0-9-]{36})["']/i,
        /data-level[-_]?id=["']([a-f0-9-]{36})["']/i,
        /"ID"\s*:\s*"([a-f0-9-]{36})"/i,
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && !candidates.includes(match[1])) {
          console.log(`GoHub Level: Found level ID in home page: ${match[1]}`);
          candidates.push(match[1]);
        }
      }

      if (candidates.length > 0) return candidates;

      // Strategy 3: Collect ALL GUIDs from the home page and try each one
      console.log(`GoHub Level: Home page snippet (first 1000 chars): ${html.substring(0, 1000)}`);

      const guidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
      const guids = html.match(guidPattern);
      if (guids && guids.length > 0) {
        const uniqueGuids = [...new Set(guids)];
        console.log(`GoHub Level: Found ${uniqueGuids.length} GUIDs on home page, will try each as level ID`);
        for (const guid of uniqueGuids) {
          if (!candidates.includes(guid)) {
            candidates.push(guid);
          }
        }
      }
    } else {
      await response.text();
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`GoHub Level: Home page error: ${msg}`);
  }

  return candidates;
}

// ─── Step 3: Fetch SubSystem data via API ────────────────────

interface CompletionsSystem {
  system_id: string;
  name: string;
  description: string;
  progress: number;
  is_hydrocarbon: boolean;
}

async function fetchCompletionsData(
  cookies: Record<string, string>,
  portalUrl: string,
  projectFilter: string
): Promise<CompletionsSystem[]> {
  const parsed = new URL(portalUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC";
  const origin = parsed.origin;

  // Step A: Discover candidate Level IDs
  const levelIds = await discoverLevelIds(cookies, origin, instanceName);
  console.log(`GoHub: Discovered ${levelIds.length} candidate Level IDs`);

  // Step B: Try API endpoints with each candidate level ID, plus null
  const apiBase = `${origin}/${instanceName}/api`;
  const resources = ["SubSystem", "System"];
  const levelOptions = [...levelIds, null]; // try all discovered IDs, then without

  for (const resource of resources) {
    for (const level of levelOptions) {
      try {
        const systems = await fetchFromApi(cookies, `${apiBase}/${resource}`, projectFilter, level ? String(level) : null);
        if (systems.length > 0) {
          console.log(`GoHub API: Got ${systems.length} systems from ${resource} (level=${level || "none"})`);
          return systems;
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`GoHub API: ${resource} (level=${level || "none"}) failed: ${msg}`);
      }
    }
  }

  // Step C: Try fetching ALL subsystems without project filter, then filter client-side
  console.log("GoHub API: Trying without project filter...");
  for (const resource of resources) {
    for (const level of levelOptions) {
      try {
        const systems = await fetchFromApi(cookies, `${apiBase}/${resource}`, "", level ? String(level) : null);
        const filtered = systems.filter(s =>
          s.system_id.toUpperCase().includes(projectFilter.toUpperCase())
        );
        if (filtered.length > 0) {
          console.log(`GoHub API: Got ${filtered.length} filtered systems from ${systems.length} total`);
          return filtered;
        }
        if (systems.length > 0) {
          console.log(`GoHub API: Got ${systems.length} systems but none match filter '${projectFilter}'`);
          console.log(`GoHub API: Sample system IDs: ${systems.slice(0, 5).map(s => s.system_id).join(", ")}`);
        }
      } catch (_) { /* already logged */ }
    }
  }

  // Step D: Scrape the HTML pages and log content for debugging
  console.log("GoHub: API attempts exhausted, trying HTML scraping...");
  const gridUrls = [
    `${origin}/${instanceName}/GoCompletions/SystemCompletion.aspx`,
    `${origin}/${instanceName}/GoCompletions/SubSystemCompletion.aspx`,
    `${origin}/${instanceName}/GoHub/GoCompletions/SystemCompletion.aspx`,
  ];

  for (const gridUrl of gridUrls) {
    try {
      console.log(`GoHub Scrape: Trying ${gridUrl}`);
      const response = await fetch(gridUrl, {
        headers: {
          Cookie: formatCookies(cookies),
          Accept: "text/html",
          "User-Agent": BROWSER_UA,
        },
      });

      if (!response.ok) {
        console.log(`GoHub Scrape: ${gridUrl} returned ${response.status}`);
        await response.text();
        continue;
      }

      const html = await response.text();

      if (html.includes("ApplicationLogin") || html.includes("Login to")) {
        console.log(`GoHub Scrape: ${gridUrl} redirected to login`);
        continue;
      }

      console.log(`GoHub Scrape: Got page from ${gridUrl}, size=${html.length}`);

      // Log key parts of the HTML for debugging
      // Title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      console.log(`GoHub Scrape: Page title: ${titleMatch?.[1] || "none"}`);

      // Look for JavaScript API calls in the page
      const apiCallPatterns = [
        /url\s*:\s*["']([^"']*api[^"']*?)["']/gi,
        /fetch\s*\(\s*["']([^"']*api[^"']*?)["']/gi,
        /\.ajax\s*\(\s*\{[^}]*url\s*:\s*["']([^"']*?)["']/gi,
        /dataSource\s*[=:]\s*["']([^"']*?)["']/gi,
        /serviceUrl\s*[=:]\s*["']([^"']*?)["']/gi,
      ];

      for (const pattern of apiCallPatterns) {
        let apiMatch;
        while ((apiMatch = pattern.exec(html)) !== null) {
          console.log(`GoHub Scrape: Found API reference in JS: ${apiMatch[1]}`);
        }
      }

      // Look for Telerik/Kendo data source configuration
      const kendoPattern = /transport\s*:\s*\{[\s\S]*?read\s*:\s*\{[\s\S]*?url\s*:\s*["']([^"']*?)["']/gi;
      let kendoMatch;
      while ((kendoMatch = kendoPattern.exec(html)) !== null) {
        console.log(`GoHub Scrape: Found Kendo datasource URL: ${kendoMatch[1]}`);
      }

      // Look for any embedded JSON data
      const jsonDataPattern = /var\s+\w+\s*=\s*(\[[\s\S]*?\]);/g;
      let jsonMatch;
      while ((jsonMatch = jsonDataPattern.exec(html)) !== null) {
        const snippet = jsonMatch[1].substring(0, 200);
        if (snippet.includes("Name") || snippet.includes("System") || snippet.includes("Progress")) {
          console.log(`GoHub Scrape: Found embedded JSON data: ${snippet}`);
        }
      }

      // Try to parse any table data
      const systems = parseCompletionsHtml(html, projectFilter);
      if (systems.length > 0) return systems;

      // Log a substantial HTML snippet for understanding structure
      // Remove script content but keep script src attributes
      const cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "[SCRIPT]");
      console.log(`GoHub Scrape: Page body snippet: ${cleanHtml.substring(0, 2000)}`);

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`GoHub Scrape: ${gridUrl} error: ${msg}`);
    }
  }

  throw new Error(
    "Could not retrieve Completions data from GoHub. " +
    "Login succeeded but data endpoints were not accessible. " +
    "This may require a specific Level/Project selection. " +
    "Check edge function logs for diagnostic details."
  );
}

async function fetchFromApi(
  cookies: Record<string, string>,
  endpoint: string,
  projectFilter: string,
  levelId: string | null
): Promise<CompletionsSystem[]> {
  const allSystems: CompletionsSystem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    let url = `${endpoint}?ps=100&p=${page}`;
    if (projectFilter) {
      url += `&Name:con=${projectFilter}`;
    }
    console.log(`GoHub API: GET ${url} (level=${levelId || "none"})`);

    const headers: Record<string, string> = {
      Cookie: formatCookies(cookies),
      Accept: "application/json",
      "User-Agent": BROWSER_UA,
    };

    if (levelId) {
      headers["X-GoTechnology-Level"] = levelId;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Access denied (${response.status}): ${text.substring(0, 100)}`);
      }
      if (response.status === 404) {
        throw new Error(`Endpoint not found (404)`);
      }
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      const text = await response.text();
      if (text.includes("<html") || text.includes("Login")) {
        throw new Error("Session not authenticated for API");
      }
      throw new Error(`Non-JSON response: ${contentType}`);
    }

    const paginationHeader = response.headers.get("X-Pagination");
    if (paginationHeader) {
      try {
        const paginationInfo = JSON.parse(paginationHeader);
        totalPages = paginationInfo.TotalPages || 1;
        console.log(`GoHub API: Page ${page}/${totalPages}`);
      } catch (_) { /* ignore */ }
    }

    const data = await response.json();

    // Log the raw response structure for first page
    if (page === 1) {
      const preview = JSON.stringify(data).substring(0, 500);
      console.log(`GoHub API: Response preview: ${preview}`);
    }

    const records: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : data.Items && Array.isArray(data.Items)
        ? data.Items
        : [];

    if (records.length === 0 && page === 1) {
      console.log(`GoHub API: No records in response`);
      break;
    }

    for (const item of records) {
      const systemId = String(item.Name || "");
      const name = String(item.Description || item.Name || "");

      let progress = 0;
      for (const field of ["Progress", "OverallProgress", "CompletionPercentage", "Completion", "PercentComplete"]) {
        if (typeof item[field] === "number") {
          progress = item[field] as number;
          break;
        }
      }

      let isHydrocarbon = false;
      if (item.Phase) {
        const phaseName = typeof item.Phase === "object"
          ? (item.Phase as Record<string, unknown>).Name
          : item.Phase;
        if (phaseName && /rfsu|hydrocarbon|hc/i.test(String(phaseName))) {
          isHydrocarbon = true;
        }
      }
      if (/\b(gas|oil|fuel|hydrocarbon)\b/i.test(name)) {
        isHydrocarbon = true;
      }

      allSystems.push({
        system_id: systemId,
        name,
        description: "Imported from GoHub",
        progress,
        is_hydrocarbon: isHydrocarbon,
      });
    }

    if (!paginationHeader && Array.isArray(data)) break;
    page++;
  } while (page <= totalPages);

  return allSystems;
}

// ─── HTML Parser ─────────────────────────────────────────────

function parseCompletionsHtml(
  html: string,
  projectFilter: string
): CompletionsSystem[] {
  const systems: CompletionsSystem[] = [];
  const filterUpper = projectFilter.toUpperCase();

  // Strategy 1: Table rows
  const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = tableRowRegex.exec(html)) !== null) {
    const row = trMatch[1];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim());
    }

    for (let i = 0; i < cells.length; i++) {
      const idMatch = cells[i].match(/([A-Z]\d{3}-[A-Z]{2,}\d{2,}-\d{2,})/);
      if (idMatch && (!filterUpper || idMatch[1].toUpperCase().includes(filterUpper))) {
        const systemId = idMatch[1];
        const name = cells[i + 1] || systemId;
        let progress = 0;
        for (let j = i + 1; j < cells.length; j++) {
          const pctMatch = cells[j].match(/([\d.]+)\s*%?/);
          if (pctMatch) {
            const val = parseFloat(pctMatch[1]);
            if (val >= 0 && val <= 100) { progress = val; break; }
          }
        }
        systems.push({
          system_id: systemId,
          name,
          description: "Imported from GoHub",
          progress,
          is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon)\b/i.test(name),
        });
      }
    }
  }

  // Strategy 2: System ID regex across entire page
  if (systems.length === 0) {
    const systemIdPattern = /[A-Z]\d{3}-[A-Z]{2,}\d{2,}-\d{2,}/g;
    const matches = html.match(systemIdPattern) || [];
    const unique = new Set<string>();

    for (const m of matches) {
      if ((!filterUpper || m.toUpperCase().includes(filterUpper)) && !unique.has(m)) {
        unique.add(m);
        const idx = html.indexOf(m);
        const context = html.substring(Math.max(0, idx - 300), Math.min(html.length, idx + 300));
        const nameMatch = context.match(/(?:title|alt|label|description|text)=["']([^"']+)["']/i);
        systems.push({
          system_id: m,
          name: nameMatch ? nameMatch[1] : m,
          description: "Imported from GoHub",
          progress: 0,
          is_hydrocarbon: false,
        });
      }
    }
  }

  return systems;
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
    const {
      portalUrl,
      username,
      password,
      projectFilter = "DP300",
    } = body;

    const finalPortalUrl =
      portalUrl ||
      Deno.env.get("GOHUB_PORTAL_URL") ||
      "https://goc.gotechnology.online/BGC/GoHub/Home.aspx";
    const finalUsername = username || Deno.env.get("GOHUB_USERNAME");
    const finalPassword = password || Deno.env.get("GOHUB_PASSWORD");

    if (!finalUsername || !finalPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "GoHub credentials required",
          setup_required: true,
          message: "Please enter your GoHub username and password.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`GoHub import: portal=${finalPortalUrl}, filter=${projectFilter}`);

    // Step 1: Login
    const sessionCookies = await webLogin(finalPortalUrl, finalUsername, finalPassword);
    console.log("GoHub import: Login successful");

    // Step 2: Fetch data
    const completionsSystems = await fetchCompletionsData(
      sessionCookies,
      finalPortalUrl,
      projectFilter
    );

    // Step 3: Transform
    const systems = completionsSystems.map((sys, index) => ({
      id: `gohub-${Date.now()}-${index}`,
      system_id: sys.system_id,
      name: sys.name,
      description: sys.description,
      is_hydrocarbon: sys.is_hydrocarbon,
      progress: sys.progress,
      source: "gohub",
    }));

    console.log(`GoHub import: ${systems.length} systems found`);

    return new Response(
      JSON.stringify({
        success: true,
        systems,
        total: systems.length,
        project_filter: projectFilter,
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
