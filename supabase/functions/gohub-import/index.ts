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

// ─── Step 4: Fetch CompletionsGrid.js and Find API ──────────

async function fetchGridScript(
  cookies: Record<string, string>,
  gridPageUrl: string,
  gridHtml: string
): Promise<string> {
  // Find the CompletionsGrid.js script URL
  const scriptMatch = gridHtml.match(/src=["']([^"']*CompletionsGrid\.js[^"']*)["']/i);
  if (!scriptMatch) {
    console.log("GoHub: CompletionsGrid.js not found in page");
    return "";
  }

  const scriptUrl = new URL(scriptMatch[1], gridPageUrl).toString();
  console.log(`GoHub: Fetching CompletionsGrid.js from: ${scriptUrl}`);

  try {
    const response = await fetch(scriptUrl, {
      headers: {
        Cookie: formatCookies(cookies),
        "User-Agent": BROWSER_UA,
        Referer: gridPageUrl,
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      console.log(`GoHub: CompletionsGrid.js returned ${response.status}`);
      return "";
    }

    const jsContent = await response.text();
    console.log(`GoHub: CompletionsGrid.js loaded, ${jsContent.length} chars`);
    // Log the content in chunks for analysis
    const chunkSize = 2000;
    for (let i = 0; i < Math.min(jsContent.length, 10000); i += chunkSize) {
      console.log(`GoHub: CompletionsGrid.js [${i}-${i + chunkSize}]: ${jsContent.substring(i, i + chunkSize)}`);
    }
    if (jsContent.length > 10000) {
      console.log(`GoHub: CompletionsGrid.js [10000-${jsContent.length}]: ${jsContent.substring(10000, 14000)}`);
    }
    return jsContent;
  } catch (error) {
    console.log(`GoHub: Error fetching CompletionsGrid.js: ${error}`);
    return "";
  }
}

// ─── Step 5: Try ASP.NET Callback ────────────────────────────

interface CompletionsSystem {
  system_id: string;
  name: string;
  description: string;
  progress: number;
  is_hydrocarbon: boolean;
}

async function tryAspNetCallback(
  cookies: Record<string, string>,
  gridHtml: string,
  gridUrl: string,
  gridScript: string
): Promise<CompletionsSystem[]> {
  console.log("GoHub: Trying ASP.NET callback to load grid data...");

  const hiddenFields = extractHiddenFields(gridHtml);

  // Extract the callback target from the JS
  // Look for WebForm_DoCallback patterns
  const callbackTargetMatch = gridScript.match(
    /WebForm_DoCallback\s*\(\s*['"]([^'"]+)['"]/
  );
  
  // Also look for __theFormPostData or callback IDs in the script
  const pageMethodMatch = gridScript.match(
    /PageMethods\.(\w+)\s*\(/
  );
  
  // Look for AJAX/fetch/XMLHttpRequest URLs in the script  
  const ajaxUrlPatterns = [
    /url\s*[:=]\s*['"]([^'"]+\.aspx[^'"]*)['"]/gi,
    /url\s*[:=]\s*['"]([^'"]+\.asmx[^'"]*)['"]/gi,
    /url\s*[:=]\s*['"]([^'"]+\/api\/[^'"]*)['"]/gi,
    /\.ajax\s*\(\s*\{[^}]*url\s*:\s*['"]([^'"]+)['"]/gi,
    /fetch\s*\(\s*['"]([^'"]+)['"]/gi,
    /XMLHttpRequest[^;]*open\s*\(\s*['"][^'"]*['"]\s*,\s*['"]([^'"]+)['"]/gi,
    /['"]([^'"]*(?:GetData|LoadData|GetGrid|GetSystems|GetSubSystems|LoadGrid|Completions)[^'"]*)['"]/gi,
  ];

  const foundUrls: string[] = [];
  for (const pattern of ajaxUrlPatterns) {
    let m;
    while ((m = pattern.exec(gridScript)) !== null) {
      foundUrls.push(m[1]);
    }
  }
  console.log(`GoHub: Found ${foundUrls.length} potential API URLs in script: ${foundUrls.join(", ")}`);

  if (callbackTargetMatch) {
    console.log(`GoHub: Found callback target: ${callbackTargetMatch[1]}`);
  }
  if (pageMethodMatch) {
    console.log(`GoHub: Found PageMethod: ${pageMethodMatch[1]}`);
  }

  // Try ASP.NET callback with __CALLBACKID=__Page
  const callbackIds = ["__Page"];
  if (callbackTargetMatch) callbackIds.push(callbackTargetMatch[1]);

  // Also try common callback params
  const callbackParams = ["", "Load", "GetData", "GetGrid", "LoadGrid"];

  const actionMatch = gridHtml.match(/<form[^>]*action=["']([^"']*?)["'][^>]*>/i);
  const formAction = actionMatch
    ? new URL(decodeHtmlEntities(actionMatch[1]), gridUrl).toString()
    : gridUrl;

  for (const cbId of callbackIds) {
    for (const cbParam of callbackParams) {
      try {
        const formData: Record<string, string> = {
          ...hiddenFields,
          __CALLBACKID: cbId,
          __CALLBACKPARAM: cbParam,
        };

        console.log(`GoHub: Trying callback ID="${cbId}", param="${cbParam}"`);

        const response = await fetch(formAction, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: formatCookies(cookies),
            "User-Agent": BROWSER_UA,
            "X-Requested-With": "XMLHttpRequest",
            Referer: gridUrl,
            Origin: new URL(gridUrl).origin,
          },
          body: new URLSearchParams(formData).toString(),
        });

        const text = await response.text();
        cookies = parseCookiesFromResponse(response, cookies);

        console.log(`GoHub: Callback response (${text.length} chars): ${text.substring(0, 1000)}`);

        // Check if the response contains system data
        if (text.includes("DP300") || text.includes("DP228") || text.includes("C017")) {
          console.log(`GoHub: Callback returned data with system identifiers!`);
          return parseCallbackResponse(text);
        }
      } catch (e) {
        console.log(`GoHub: Callback error: ${e}`);
      }
    }
  }

  // Try any API URLs found in the script
  for (const apiUrl of foundUrls) {
    try {
      const fullUrl = new URL(apiUrl, gridUrl).toString();
      console.log(`GoHub: Trying API URL from script: ${fullUrl}`);

      const response = await fetch(fullUrl, {
        headers: {
          Cookie: formatCookies(cookies),
          "User-Agent": BROWSER_UA,
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json, text/javascript, */*",
          Referer: gridUrl,
        },
      });

      const text = await response.text();
      console.log(`GoHub: API response (${text.length} chars): ${text.substring(0, 500)}`);

      if (text.includes("DP300") || text.includes("C017")) {
        console.log(`GoHub: API URL returned data with system identifiers!`);
        return parseCallbackResponse(text);
      }
    } catch (_) { /* continue */ }
  }

  return [];
}

function parseCallbackResponse(text: string): CompletionsSystem[] {
  const systems: CompletionsSystem[] = [];
  const seen = new Set<string>();

  // Try parsing as JSON first
  try {
    let data = JSON.parse(text);
    if (!Array.isArray(data)) {
      // Check common wrapper patterns
      if (data.d) data = typeof data.d === "string" ? JSON.parse(data.d) : data.d;
      if (data.Items) data = data.Items;
      if (data.data) data = data.data;
      if (data.results) data = data.results;
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        const sysId = String(item.Name || item.SubSystemName || item.SystemId || item.Id || "");
        if (!sysId || seen.has(sysId)) continue;
        seen.add(sysId);

        systems.push({
          system_id: sysId,
          name: String(item.Description || item.SubSystemDescription || item.Title || sysId),
          description: "Imported from GoCompletions",
          progress: parseFloat(item.Progress || item.OverallProgress || item.Percent || "0") || 0,
          is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon|flare)\b/i.test(
            String(item.Description || item.Title || "")
          ),
        });
      }
      return systems;
    }
  } catch (_) { /* not JSON, try regex */ }

  // Try extracting system IDs from plain text/HTML response
  const systemIdPattern = /([A-Z]\d{2,4}-[A-Z0-9]{2,}-[A-Z0-9-]+)/g;
  let match;
  while ((match = systemIdPattern.exec(text)) !== null) {
    const sysId = match[1];
    if (seen.has(sysId)) continue;
    seen.add(sysId);

    // Look for percentage near this ID
    const afterIdx = match.index + sysId.length;
    const context = text.substring(afterIdx, afterIdx + 500);
    let progress = 0;
    const pctMatch = context.match(/([\d.]+)\s*%/);
    if (pctMatch) {
      const val = parseFloat(pctMatch[1]);
      if (val >= 0 && val <= 100) progress = val;
    }

    // Look for name/description
    let name = sysId;
    const nameMatch = context.match(/["',]\s*([A-Za-z][A-Za-z0-9\s\-–—.,&()/']{2,60})/);
    if (nameMatch) name = nameMatch[1].trim();

    systems.push({
      system_id: sysId,
      name,
      description: "Imported from GoCompletions",
      progress,
      is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon|flare)\b/i.test(name),
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

    // Step 4: Fetch CompletionsGrid.js to understand the data loading mechanism
    const gridScript = await fetchGridScript(gridCookies, gridPageUrl, gridHtml);

    // Step 5: Try ASP.NET callback / API calls based on what we found in the script
    let completionsSystems = await tryAspNetCallback(gridCookies, gridHtml, gridPageUrl, gridScript);
    console.log(`GoHub: Callback/API approach found ${completionsSystems.length} systems`);

    // Filter by project filter
    if (completionsSystems.length > 0 && projectFilter) {
      const filterUpper = projectFilter.toUpperCase();
      const filtered = completionsSystems.filter(s => s.system_id.toUpperCase().includes(filterUpper));
      console.log(`GoHub: Filtered to ${filtered.length} systems matching "${projectFilter}" from ${completionsSystems.length} total`);
      if (filtered.length > 0) {
        completionsSystems = filtered;
      }
      // If filter yields 0 results, return all systems with a note
    }

    if (completionsSystems.length === 0) {
      throw new Error(
        `No systems found. The Completions Grid page loaded successfully but the data is loaded ` +
        `dynamically via JavaScript (Grid.Load() in CompletionsGrid.js). ` +
        `ASP.NET callbacks and API endpoints were tried but none returned data. ` +
        `Check edge function logs for CompletionsGrid.js content to identify the correct API.`
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
