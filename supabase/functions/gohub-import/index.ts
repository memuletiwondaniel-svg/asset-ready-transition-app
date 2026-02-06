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

  // Navigate to portal → follow redirects to Login.aspx
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

  // Parse ASP.NET hidden fields (__VIEWSTATE, etc.)
  const hiddenFields = extractHiddenFields(loginPageHtml);
  console.log(
    `GoHub Auth: Hidden fields: ${Object.keys(hiddenFields).join(", ")}`
  );

  // Detect field names from HTML
  let userField = "ApplicationLogin$UserName";
  let passField = "ApplicationLogin$Password";
  let buttonField = "ApplicationLogin$LoginButton";
  let buttonValue = "Log In";

  const userInputMatch = loginPageHtml.match(
    /name=["']([\w$]+UserName[\w$]*)["']/i
  );
  const passInputMatch = loginPageHtml.match(
    /name=["']([\w$]+Password[\w$]*)["']/i
  );
  const buttonMatch = loginPageHtml.match(
    /name=["']([\w$]+Login\w*Button[\w$]*)["'][^>]*value=["']([^"']*)["']/i
  );

  if (userInputMatch) userField = userInputMatch[1];
  if (passInputMatch) passField = passInputMatch[1];
  if (buttonMatch) {
    buttonField = buttonMatch[1];
    buttonValue = buttonMatch[2];
  }

  console.log(
    `GoHub Auth: Fields: user=${userField}, pass=${passField}, btn=${buttonField}`
  );

  const actionMatch = loginPageHtml.match(
    /<form[^>]*action=["']([^"']*?)["'][^>]*>/i
  );
  const formAction = actionMatch
    ? new URL(
        actionMatch[1].replace(/&amp;/g, "&"),
        loginPageUrl
      ).toString()
    : loginPageUrl;

  // Submit the login form
  const formData: Record<string, string> = {
    ...hiddenFields,
    [userField]: username,
    [passField]: password,
    [buttonField]: buttonValue,
  };

  console.log(`GoHub Auth: Submitting to ${formAction.substring(0, 100)}`);

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
    const errorMsgMatch = responseHtml.match(
      /class=["']ErrorMessage["'][^>]*>\s*([^<]+)/i
    );
    if (errorMsgMatch && errorMsgMatch[1].trim()) {
      throw new Error(`Login failed: ${errorMsgMatch[1].trim()}`);
    }
    if (
      responseHtml.includes("ApplicationLogin") ||
      responseHtml.includes("Login to")
    ) {
      throw new Error(
        "Login failed: Invalid username or password. Check your GoHub credentials."
      );
    }
    console.log("GoHub Auth: No redirect after login, but no error detected");
  } else {
    await loginResponse.text();
  }

  // Follow redirect chain after login
  if (postLocation) {
    url = new URL(postLocation, formAction).toString();
    for (let i = 0; i < 10; i++) {
      console.log(
        `GoHub Auth: Post-login redirect ${i + 1}: ${url.substring(0, 120)}`
      );
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

  console.log(
    `GoHub Auth: Login complete, ${Object.keys(cookies).length} cookies captured`
  );
  return cookies;
}

// ─── Step 2: Fetch Completions Grid data via API ─────────────

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

  // Try API endpoints to get SubSystem data with progress
  const apiEndpoints = [
    `${origin}/${instanceName}/api/SubSystem`,
    `${origin}/${instanceName}/api/System`,
    `${origin}/api/SubSystem`,
  ];

  // Try fetching from API with session cookies
  for (const endpoint of apiEndpoints) {
    try {
      console.log(`GoHub API: Trying ${endpoint}...`);
      const systems = await fetchSubSystemsFromApi(cookies, endpoint, projectFilter);
      if (systems.length > 0) {
        console.log(`GoHub API: Got ${systems.length} systems from ${endpoint}`);
        return systems;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`GoHub API: ${endpoint} failed: ${msg}`);
    }
  }

  // If API fails, try scraping the Completions Grid page
  console.log("GoHub: API attempts failed, trying HTML scraping...");
  try {
    return await scrapeCompletionsGrid(cookies, origin, instanceName, projectFilter);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`GoHub Scrape: Failed: ${msg}`);
  }

  throw new Error(
    "Could not retrieve Completions data from GoHub. " +
    "The API endpoints and Completions Grid page were both inaccessible. " +
    "Please verify you have access to the Completions module in GoHub."
  );
}

async function fetchSubSystemsFromApi(
  cookies: Record<string, string>,
  endpoint: string,
  projectFilter: string
): Promise<CompletionsSystem[]> {
  const allSystems: CompletionsSystem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    // Use Name:con= filter to search for systems containing the project ID
    const url = `${endpoint}?ps=100&p=${page}&Name:con=${projectFilter}`;
    console.log(`GoHub API: GET ${url}`);

    const response = await fetch(url, {
      headers: {
        Cookie: formatCookies(cookies),
        Accept: "application/json",
        "User-Agent": BROWSER_UA,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Access denied (${response.status})`);
      }
      if (response.status === 404) {
        throw new Error(`Endpoint not found`);
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

    // Check X-Pagination header for paging info
    const paginationHeader = response.headers.get("X-Pagination");
    if (paginationHeader) {
      try {
        const paginationInfo = JSON.parse(paginationHeader);
        totalPages = paginationInfo.TotalPages || 1;
        console.log(`GoHub API: Page ${page}/${totalPages} (from X-Pagination)`);
      } catch (_) { /* ignore parse errors */ }
    }

    const data = await response.json();
    const records: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : data.Items && Array.isArray(data.Items)
        ? data.Items
        : [data];

    for (const item of records) {
      const systemId = String(item.Name || "");
      const name = String(item.Description || item.Name || "");

      // Filter for the project
      if (!systemId.toUpperCase().includes(projectFilter.toUpperCase())) continue;

      // Extract progress - try various field names
      let progress = 0;
      if (typeof item.Progress === "number") {
        progress = item.Progress;
      } else if (typeof item.OverallProgress === "number") {
        progress = item.OverallProgress;
      } else if (typeof item.CompletionPercentage === "number") {
        progress = item.CompletionPercentage;
      } else if (typeof item.Completion === "number") {
        progress = item.Completion;
      }

      // Detect hydrocarbon systems
      let isHydrocarbon = false;
      if (item.Phase) {
        const phaseName = typeof item.Phase === "object"
          ? (item.Phase as Record<string, unknown>).Name
          : item.Phase;
        if (phaseName && /rfsu|hydrocarbon|hc/i.test(String(phaseName))) {
          isHydrocarbon = true;
        }
      }
      // Also check system name for gas/oil keywords
      if (/\b(gas|oil|fuel|hydrocarbon)\b/i.test(name)) {
        isHydrocarbon = true;
      }

      allSystems.push({
        system_id: systemId,
        name,
        description: `Imported from GoHub`,
        progress,
        is_hydrocarbon: isHydrocarbon,
      });
    }

    // If no X-Pagination and response was a plain array, we're done
    if (!paginationHeader && Array.isArray(data)) break;

    page++;
  } while (page <= totalPages);

  return allSystems;
}

// ─── Fallback: Scrape Completions Grid HTML ──────────────────

async function scrapeCompletionsGrid(
  cookies: Record<string, string>,
  origin: string,
  instanceName: string,
  projectFilter: string
): Promise<CompletionsSystem[]> {
  // Try common URLs for the Completions Grid page
  const gridUrls = [
    `${origin}/${instanceName}/GoCompletions/SystemCompletion.aspx`,
    `${origin}/${instanceName}/GoCompletions/SubSystemCompletion.aspx`,
    `${origin}/${instanceName}/GoCompletions/`,
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

      // Check if we got redirected to login
      if (html.includes("ApplicationLogin") || html.includes("Login to")) {
        console.log(`GoHub Scrape: ${gridUrl} redirected to login`);
        continue;
      }

      console.log(`GoHub Scrape: Got page from ${gridUrl}, size=${html.length}`);
      const systems = parseCompletionsHtml(html, projectFilter);
      if (systems.length > 0) return systems;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`GoHub Scrape: ${gridUrl} error: ${msg}`);
    }
  }

  throw new Error("No Completions Grid page found");
}

function parseCompletionsHtml(
  html: string,
  projectFilter: string
): CompletionsSystem[] {
  const systems: CompletionsSystem[] = [];

  // Strategy 1: Look for card/tile elements with system data
  // Pattern: System ID (XXXX-YYYYY-ZZZ), Name, Progress %
  const systemIdPattern = /[A-Z]\d{3}-[A-Z]{2}\d{3}-\d{3}/g;
  const matches = html.match(systemIdPattern) || [];

  // Strategy 2: Parse table rows if present
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

    // Look for cells that contain our system ID pattern
    for (let i = 0; i < cells.length; i++) {
      const idMatch = cells[i].match(/([A-Z]\d{3}-[A-Z]{2}\d{3}-\d{3})/);
      if (idMatch && idMatch[1].toUpperCase().includes(projectFilter.toUpperCase())) {
        const systemId = idMatch[1];
        const name = cells[i + 1] || systemId;

        // Look for a percentage in remaining cells
        let progress = 0;
        for (let j = i + 1; j < cells.length; j++) {
          const pctMatch = cells[j].match(/([\d.]+)\s*%?/);
          if (pctMatch) {
            const val = parseFloat(pctMatch[1]);
            if (val >= 0 && val <= 100) {
              progress = val;
              break;
            }
          }
        }

        systems.push({
          system_id: systemId,
          name,
          description: "Imported from GoHub (scraped)",
          progress,
          is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon)\b/i.test(name),
        });
      }
    }
  }

  // Strategy 3: Broad regex for system IDs on the page
  if (systems.length === 0) {
    const unique = new Set<string>();
    for (const m of matches) {
      if (m.toUpperCase().includes(projectFilter.toUpperCase()) && !unique.has(m)) {
        unique.add(m);

        // Try to find a label/name near the system ID
        const idx = html.indexOf(m);
        const context = html.substring(
          Math.max(0, idx - 200),
          Math.min(html.length, idx + 200)
        );
        const nameMatch = context.match(
          /(?:title|alt|label|description)=["']([^"']+)["']/i
        );

        systems.push({
          system_id: m,
          name: nameMatch ? nameMatch[1] : m,
          description: "Imported from GoHub (scraped)",
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
    // Validate Supabase user
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

    // Parse request body
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
          message:
            "Please enter your GoHub username and password in the import dialog.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`GoHub import: Logging in to ${finalPortalUrl}`);
    console.log(`GoHub import: Project filter = ${projectFilter}`);

    // Step 1: Login
    const sessionCookies = await webLogin(
      finalPortalUrl,
      finalUsername,
      finalPassword
    );
    console.log("GoHub import: Login successful");

    // Step 2: Fetch Completions Grid data, filtered by project
    const completionsSystems = await fetchCompletionsData(
      sessionCookies,
      finalPortalUrl,
      projectFilter
    );

    // Step 3: Transform to wizard format
    const systems = completionsSystems.map((sys, index) => ({
      id: `gohub-${Date.now()}-${index}`,
      system_id: sys.system_id,
      name: sys.name,
      description: sys.description,
      is_hydrocarbon: sys.is_hydrocarbon,
      progress: sys.progress,
      source: "gohub",
    }));

    console.log(
      `GoHub import: ${systems.length} DP300 systems found`
    );

    return new Response(
      JSON.stringify({
        success: true,
        systems,
        total: systems.length,
        project_filter: projectFilter,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("GoHub import error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
