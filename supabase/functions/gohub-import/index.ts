import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
      for (const part of combined.split(/,(?=[^ ])/)) {
        const [nameValue] = part.split(";");
        const eqIndex = nameValue.indexOf("=");
        if (eqIndex > 0) {
          cookies[nameValue.substring(0, eqIndex).trim()] =
            nameValue.substring(eqIndex + 1).trim();
        }
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

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

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
        ? decodeHtmlEntities(valueMatch[1])
        : "";
    }
  }
  return fields;
}

/** Follow redirects manually, collecting cookies along the way */
async function followRedirects(
  url: string,
  cookies: Record<string, string>,
  maxRedirects = 10
): Promise<{ html: string; url: string; cookies: Record<string, string> }> {
  let currentUrl = url;
  for (let i = 0; i < maxRedirects; i++) {
    const response = await fetch(currentUrl, {
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
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    const html = await response.text();
    return { html, url: currentUrl, cookies };
  }
  throw new Error("Too many redirects");
}

// ─── Step 1: ASP.NET Web Login ──────────────────────────────

async function webLogin(
  portalUrl: string,
  username: string,
  password: string
): Promise<{ cookies: Record<string, string>; homePageHtml: string; homePageUrl: string }> {
  console.log("GoHub: Starting web login...");
  let cookies: Record<string, string> = {};

  const { html: loginPageHtml, url: loginPageUrl, cookies: loginCookies } =
    await followRedirects(portalUrl, cookies);
  cookies = loginCookies;

  if (!loginPageHtml) throw new Error("Could not reach the GoHub login page");
  console.log(`GoHub: Login page at ${loginPageUrl.substring(0, 80)}, size=${loginPageHtml.length}`);

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
  if (buttonMatch) { buttonField = buttonMatch[1]; buttonValue = buttonMatch[2]; }

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

  console.log("GoHub: Submitting login form...");

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
    if (errorMsgMatch && errorMsgMatch[1].trim()) throw new Error(`Login failed: ${errorMsgMatch[1].trim()}`);
    if (responseHtml.includes("ApplicationLogin") || responseHtml.includes("Login to"))
      throw new Error("Login failed: Invalid username or password.");
    return { cookies, homePageHtml: responseHtml, homePageUrl: formAction };
  }

  await loginResponse.text();
  const { html: homeHtml, url: homeUrl, cookies: homeCookies } =
    await followRedirects(new URL(postLocation, formAction).toString(), cookies);
  cookies = homeCookies;

  console.log(`GoHub: Login complete. Home page URL: ${homeUrl.substring(0, 100)}`);
  return { cookies, homePageHtml: homeHtml, homePageUrl: homeUrl };
}

// ─── Step 2: Select Project (ZUBAIR / ZB) ────────────────────

async function selectProject(
  cookies: Record<string, string>,
  homePageHtml: string,
  homePageUrl: string,
  _projectCode: string
): Promise<{ cookies: Record<string, string>; responseHtml: string; responseUrl: string }> {
  console.log(`GoHub: Looking for project on home page...`);

  let selectedPostback: { target: string; argument: string } | null = null;

  const tileLinkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]{0,500}?ZUBAIR/gi;
  const tileMatch = tileLinkPattern.exec(homePageHtml);
  if (tileMatch) {
    const tileHref = decodeHtmlEntities(tileMatch[1]);
    console.log(`GoHub: Found ZUBAIR tile link (decoded): ${tileHref}`);
    if (tileHref.includes("__doPostBack")) {
      const pbExtract = tileHref.match(/__doPostBack\s*\(\s*'([^']+)'\s*,\s*'([^']*)'\s*\)/);
      if (pbExtract) {
        selectedPostback = { target: pbExtract[1], argument: pbExtract[2] };
        console.log(`GoHub: Extracted project postback: target=${pbExtract[1]}`);
      }
    } else if (!tileHref.startsWith("javascript:")) {
      const projectUrl = new URL(tileHref, homePageUrl).toString();
      const result = await followRedirects(projectUrl, cookies);
      return { cookies: result.cookies, responseHtml: result.html, responseUrl: result.url };
    }
  }

  if (!selectedPostback) {
    const decodedHtml = decodeHtmlEntities(homePageHtml);
    const postbackPattern = /__doPostBack\s*\(\s*'([^']+)'\s*,\s*'([^']*)'\s*\)/g;
    let pbMatch;
    while ((pbMatch = postbackPattern.exec(decodedHtml)) !== null) {
      if (pbMatch[1].includes("ProjectButton") || pbMatch[1].includes("ProjectList")) {
        const start = Math.max(0, pbMatch.index - 300);
        const context = decodedHtml.substring(start, pbMatch.index + pbMatch[0].length + 300);
        if (/ZUBAIR/i.test(context)) {
          selectedPostback = { target: pbMatch[1], argument: pbMatch[2] };
          break;
        }
      }
    }
  }

  if (!selectedPostback) {
    console.log("GoHub: WARNING - Could not find project selection postback");
    return { cookies, responseHtml: homePageHtml, responseUrl: homePageUrl };
  }

  console.log(`GoHub: Submitting project selection postback: ${selectedPostback.target}`);
  const hiddenFields = extractHiddenFields(homePageHtml);
  const formData: Record<string, string> = {
    ...hiddenFields,
    __EVENTTARGET: selectedPostback.target,
    __EVENTARGUMENT: selectedPostback.argument,
  };

  const actionMatch = homePageHtml.match(/<form[^>]*action=["']([^"']*?)["'][^>]*>/i);
  const formAction = actionMatch
    ? new URL(decodeHtmlEntities(actionMatch[1]), homePageUrl).toString()
    : homePageUrl;

  const response = await fetch(formAction, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: formatCookies(cookies),
      "User-Agent": BROWSER_UA,
      Referer: homePageUrl,
      Origin: new URL(homePageUrl).origin,
    },
    body: new URLSearchParams(formData).toString(),
  });
  cookies = parseCookiesFromResponse(response, cookies);
  const location = response.headers.get("location");

  if (location) {
    await response.text();
    const result = await followRedirects(new URL(location, formAction).toString(), cookies);
    console.log(`GoHub: Project selected, redirected to: ${result.url.substring(0, 100)}`);
    return { cookies: result.cookies, responseHtml: result.html, responseUrl: result.url };
  }

  const responseHtml = await response.text();
  return { cookies, responseHtml, responseUrl: formAction };
}

// ─── Step 3: Navigate to Completions Grid ────────────────────

async function navigateToCompletionsGrid(
  cookies: Record<string, string>,
  portalUrl: string,
  postSelectionHtml: string,
  postSelectionUrl: string
): Promise<{ html: string; url: string; cookies: Record<string, string> }> {
  const parsed = new URL(portalUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC";
  const origin = parsed.origin;

  // Try finding a link in the post-selection HTML
  const gridLinkPatterns = [
    /href=["']([^"']*CompletionsGrid[^"']*)["']/i,
    /href=["']([^"']*SystemCompletion[^"']*)["']/i,
  ];

  for (const pattern of gridLinkPatterns) {
    const match = postSelectionHtml.match(pattern);
    if (match) {
      const linkHref = decodeHtmlEntities(match[1]);
      console.log(`GoHub: Found Completions Grid link: ${linkHref}`);
      const gridUrl = new URL(linkHref, postSelectionUrl).toString();
      const result = await followRedirects(gridUrl, cookies);
      cookies = result.cookies;
      if (!result.html.includes("GenericErrorPage") && !result.html.includes("Contact Support")) {
        return { html: result.html, url: result.url, cookies };
      }
    }
  }

  // Direct URL fallback
  const gridUrls = [
    `${origin}/${instanceName}/GoCompletions/Completions/CompletionsGrid.aspx`,
    `${origin}/${instanceName}/GoCompletions/SystemCompletion.aspx`,
  ];
  for (const gridUrl of gridUrls) {
    try {
      const result = await followRedirects(gridUrl, cookies);
      cookies = result.cookies;
      if (!result.html.includes("ApplicationLogin") && !result.html.includes("GenericErrorPage")) {
        return { html: result.html, url: result.url, cookies };
      }
    } catch (_) { /* continue */ }
  }

  throw new Error("Could not access the Completions Grid page.");
}

// ─── Data Types ─────────────────────────────────────────────

interface CompletionsSystem {
  system_id: string;
  name: string;
  description: string;
  progress: number;
  is_hydrocarbon: boolean;
}

// ─── Resolve ASMX service URL from page HTML ────────────────

function resolveAsmxServiceUrl(gridHtml: string, gridPageUrl: string): string | null {
  // Look for the ASMX script reference: <script src="../../Controls/CompletionsGrid.asmx/js">
  const asmxMatch = gridHtml.match(/src=["']([^"']*CompletionsGrid\.asmx)\/js["']/i);
  if (asmxMatch) {
    const relativePath = asmxMatch[1];
    // Resolve relative to the grid page's directory
    const pageDir = gridPageUrl.replace(/\/[^/]*$/, "/");
    const resolved = new URL(relativePath, pageDir).toString();
    console.log(`GoHub: Resolved ASMX service URL: ${resolved} (from relative: ${relativePath})`);
    return resolved;
  }
  return null;
}

// ─── Strategy 1: ASMX WebMethod (correct endpoint) ─────────
// The JS proxy CompletionsGrid.GetSystems() maps to:
// POST /BGC/Controls/CompletionsGrid.asmx/GetSystems

async function tryAsmxWebMethod(
  cookies: Record<string, string>,
  gridPageUrl: string,
  gridHtml: string
): Promise<CompletionsSystem[]> {
  // First, resolve the correct ASMX service URL from the page HTML
  const asmxBaseUrl = resolveAsmxServiceUrl(gridHtml, gridPageUrl);
  
  const origin = new URL(gridPageUrl).origin;
  const parsed = new URL(gridPageUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC";

  // Build list of URLs to try, starting with the correctly resolved one
  const urlsToTry: string[] = [];
  
  if (asmxBaseUrl) {
    urlsToTry.push(`${asmxBaseUrl}/GetSystems`);
  }
  
  // Also try common paths as fallbacks
  urlsToTry.push(
    `${origin}/${instanceName}/Controls/CompletionsGrid.asmx/GetSystems`,
    `${origin}/${instanceName}/GoCompletions/Controls/CompletionsGrid.asmx/GetSystems`,
  );

  // Deduplicate
  const uniqueUrls = [...new Set(urlsToTry)];

  for (const url of uniqueUrls) {
    console.log(`GoHub: Trying ASMX WebMethod: ${url}`);
    
    const itrClasses = ["All", ""];
    for (const itrClass of itrClasses) {
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

        const status = response.status;
        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();
        cookies = parseCookiesFromResponse(response, cookies);

        console.log(`GoHub: ASMX response: url=${url}, itrClass=${itrClass}, status=${status}, type=${contentType}, length=${text.length}`);
        console.log(`GoHub: ASMX response preview: ${text.substring(0, 3000)}`);

        if (status === 200 && text.length > 50) {
          const systems = parsePageMethodResponse(text);
          if (systems.length > 0) {
            console.log(`GoHub: ASMX WebMethod returned ${systems.length} systems!`);
            return systems;
          }
        }

        // If 401/500, log details and try next
        if (status >= 400) {
          console.log(`GoHub: ASMX error ${status}: ${text.substring(0, 500)}`);
        }
      } catch (e) {
        console.log(`GoHub: ASMX WebMethod error for ${url}: ${e}`);
      }
    }
  }

  return [];
}

// ─── Strategy 2: ASP.NET PageMethod on the ASPX page ────────

async function tryPageMethod(
  cookies: Record<string, string>,
  gridPageUrl: string
): Promise<CompletionsSystem[]> {
  const pageMethodUrl = gridPageUrl.replace(/\?.*$/, "") + "/GetSystems";
  console.log(`GoHub: Trying PageMethod: ${pageMethodUrl}`);

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
    console.log(`GoHub: PageMethod response: status=${response.status}, length=${text.length}, preview=${text.substring(0, 1000)}`);

    if (response.status === 200 && text.length > 50) {
      const systems = parsePageMethodResponse(text);
      if (systems.length > 0) return systems;
    }
  } catch (e) {
    console.log(`GoHub: PageMethod error: ${e}`);
  }

  return [];
}

// ─── Strategy 3: Extract data from HTML itself ──────────────

function extractFromHtml(gridHtml: string): CompletionsSystem[] {
  console.log("GoHub: Extracting any data directly from HTML...");

  const systems: CompletionsSystem[] = [];
  const seen = new Set<string>();

  // Strip massive hidden fields to see actual content
  const cleanHtml = gridHtml
    .replace(/<input[^>]*type=["']hidden["'][^>]*>/gi, "")
    .replace(/\s+/g, " ");

  // Look for div elements that represent grid items (from CompletionsGrid.js pattern)
  // The JS creates divs like: <div class='gt-item'> with system data
  const gtItemPattern = /<div[^>]*class=["'][^"']*gt-item[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let itemMatch;
  while ((itemMatch = gtItemPattern.exec(cleanHtml)) !== null) {
    const content = itemMatch[1];
    // Try to extract system ID and percentage from the content
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
      });
    }
  }

  // Look for system ID patterns in any visible text
  // Patterns like DP300-C017-001, DP228-XXX, etc.
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

      // Try to find a description nearby
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
      });
    }
  }

  if (systems.length > 0) {
    console.log(`GoHub: Extracted ${systems.length} systems from HTML`);
  }

  // Log some of the visible HTML content (not hidden fields) for debugging
  // Extract script blocks that might contain inline data
  const scriptBlocks = cleanHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of scriptBlocks) {
    if (block.includes("jsonData") || block.includes("Grid.") || block.includes("System")) {
      console.log(`GoHub: Relevant script block (${block.length} chars): ${block.substring(0, 1500)}`);
    }
  }

  // Log visible text content for debugging (strip all tags)
  const visibleText = cleanHtml
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  console.log(`GoHub: Visible text on grid page (first 3000 chars): ${visibleText.substring(0, 3000)}`);

  return systems;
}

// (Old tryAsmxService removed - functionality merged into tryAsmxWebMethod above)

// ─── Response Parser ────────────────────────────────────────

function parsePageMethodResponse(text: string): CompletionsSystem[] {
  const systems: CompletionsSystem[] = [];
  const seen = new Set<string>();

  // ASP.NET PageMethod responses wrap in {"d": ...}
  try {
    let data = JSON.parse(text);

    // Unwrap the "d" wrapper (ASP.NET standard)
    if (data.d !== undefined) {
      data = typeof data.d === "string" ? JSON.parse(data.d) : data.d;
    }

    // If it's wrapped in another object, try common keys
    if (!Array.isArray(data)) {
      for (const key of ["Items", "data", "results", "Systems", "systems", "Data"]) {
        if (data[key] && Array.isArray(data[key])) {
          data = data[key];
          break;
        }
      }
    }

    // If still a string (double-encoded JSON), parse again
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch (_) { /* not JSON */ }
    }

    if (Array.isArray(data)) {
      console.log(`GoHub: Parsed JSON array with ${data.length} items`);
      if (data.length > 0) {
        console.log(`GoHub: First item keys: ${Object.keys(data[0]).join(", ")}`);
        console.log(`GoHub: First item: ${JSON.stringify(data[0]).substring(0, 500)}`);
      }

      for (const item of data) {
        // Try various field name patterns from GoCompletions
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

        // Progress/completion percentage
        let progress = 0;
        const pctValue = item.Complete ?? item.Progress ?? item.OverallProgress ??
          item.Percent ?? item.CompletionPercent ?? item.percentage ?? null;
        if (pctValue !== null && pctValue !== undefined) {
          progress = parseFloat(String(pctValue)) || 0;
          // If it's 0-1 range, convert to percentage
          if (progress > 0 && progress <= 1) progress *= 100;
        }

        // SubSystem data might be nested
        const subSystems = item.SubSystem || item.SubSystems || item.subsystems || [];

        systems.push({
          system_id: sysId,
          name,
          description: `Imported from GoCompletions${subSystems.length ? ` (${subSystems.length} subsystems)` : ""}`,
          progress,
          is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon|flare)\b/i.test(name + " " + sysId),
        });
      }
      return systems;
    }
  } catch (e) {
    console.log(`GoHub: JSON parse error: ${e}`);
  }

  // Fallback: try to find system ID patterns in raw text
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
    });
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
    const { portalUrl, username, password, projectFilter = "DP300" } = body;

    const finalPortalUrl = portalUrl || "https://goc.gotechnology.online/BGC/GoHub/Home.aspx";
    const finalUsername = username;
    const finalPassword = password;

    if (!finalUsername || !finalPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "GoHub credentials required", setup_required: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`GoHub import: portal=${finalPortalUrl}, filter=${projectFilter}`);

    // Step 1: Login
    const { cookies, homePageHtml, homePageUrl } = await webLogin(finalPortalUrl, finalUsername, finalPassword);
    console.log("GoHub: Login successful");

    // Step 2: Select ZUBAIR project
    const { cookies: projectCookies, responseHtml: postSelectionHtml, responseUrl: postSelectionUrl } =
      await selectProject(cookies, homePageHtml, homePageUrl, "ZB");
    console.log("GoHub: Project selection complete");

    // Step 3: Navigate to Completions Grid
    const { html: gridHtml, url: gridPageUrl, cookies: gridCookies } = await navigateToCompletionsGrid(
      projectCookies, finalPortalUrl, postSelectionHtml, postSelectionUrl
    );
    console.log(`GoHub: Got Completions Grid HTML, size=${gridHtml.length}`);

    let completionsSystems: CompletionsSystem[] = [];

    // Strategy 1: ASMX WebMethod (correct endpoint from script src)
    // The JS proxy src="../../Controls/CompletionsGrid.asmx/js" resolves to /BGC/Controls/CompletionsGrid.asmx
    completionsSystems = await tryAsmxWebMethod(gridCookies, gridPageUrl, gridHtml);
    console.log(`GoHub: ASMX WebMethod found ${completionsSystems.length} systems`);

    // Strategy 2: ASP.NET PageMethod on the ASPX page itself
    if (completionsSystems.length === 0) {
      completionsSystems = await tryPageMethod(gridCookies, gridPageUrl);
      console.log(`GoHub: PageMethod found ${completionsSystems.length} systems`);
    }

    // Strategy 3: Extract whatever data is visible in the HTML itself
    if (completionsSystems.length === 0) {
      completionsSystems = extractFromHtml(gridHtml);
      console.log(`GoHub: HTML extraction found ${completionsSystems.length} systems`);
    }

    // Filter by project filter
    if (completionsSystems.length > 0 && projectFilter) {
      const filterUpper = projectFilter.toUpperCase();
      const filtered = completionsSystems.filter(s => s.system_id.toUpperCase().includes(filterUpper));
      console.log(`GoHub: Filtered to ${filtered.length} systems matching "${projectFilter}" from ${completionsSystems.length} total`);
      if (filtered.length > 0) {
        completionsSystems = filtered;
      }
    }

    if (completionsSystems.length === 0) {
      throw new Error(
        `No systems found despite trying PageMethod, ScriptManager, ASMX service, and HTML extraction. ` +
        `The Completions Grid page loaded (${gridHtml.length} chars) but no data could be extracted. ` +
        `Check edge function logs for visible page content and API response details.`
      );
    }

    // Transform for frontend
    const systems = completionsSystems.map((sys, index) => ({
      id: `gohub-${Date.now()}-${index}`,
      system_id: sys.system_id,
      name: sys.name,
      description: sys.description,
      is_hydrocarbon: sys.is_hydrocarbon,
      progress: sys.progress,
      source: "gohub",
    }));

    console.log(`GoHub import: SUCCESS - ${systems.length} systems found`);

    return new Response(
      JSON.stringify({ success: true, systems, total: systems.length, project_filter: projectFilter }),
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
