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

  // Follow redirects to reach the login page
  const { html: loginPageHtml, url: loginPageUrl, cookies: loginCookies } =
    await followRedirects(portalUrl, cookies);
  cookies = loginCookies;

  if (!loginPageHtml) {
    throw new Error("Could not reach the GoHub login page");
  }

  console.log(`GoHub: Login page at ${loginPageUrl.substring(0, 80)}, size=${loginPageHtml.length}`);

  const hiddenFields = extractHiddenFields(loginPageHtml);

  // Detect form field names
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
    if (errorMsgMatch && errorMsgMatch[1].trim()) {
      throw new Error(`Login failed: ${errorMsgMatch[1].trim()}`);
    }
    if (responseHtml.includes("ApplicationLogin") || responseHtml.includes("Login to")) {
      throw new Error("Login failed: Invalid username or password.");
    }
    // Login may have succeeded without redirect (single page)
    return { cookies, homePageHtml: responseHtml, homePageUrl: formAction };
  }

  await loginResponse.text();

  // Follow the post-login redirect chain to reach the home page
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
  projectCode: string
): Promise<{ cookies: Record<string, string>; responseHtml: string; responseUrl: string }> {
  console.log(`GoHub: Looking for project "${projectCode}" on home page...`);

  // Decode HTML entities so postback patterns match
  const decodedHtml = decodeHtmlEntities(homePageHtml);

  // Find the ZUBAIR project tile postback (most reliable method)
  let selectedPostback: { target: string; argument: string } | null = null;

  // Method 1: Find tile link with ZUBAIR text nearby
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
      // Direct URL link
      const projectUrl = new URL(tileHref, homePageUrl).toString();
      console.log(`GoHub: Navigating to project URL: ${projectUrl}`);
      const result = await followRedirects(projectUrl, cookies);
      return { cookies: result.cookies, responseHtml: result.html, responseUrl: result.url };
    }
  }

  // Method 2: Search all postbacks for one containing ProjectButton and near ZUBAIR
  if (!selectedPostback) {
    const postbackPattern = /__doPostBack\s*\(\s*'([^']+)'\s*,\s*'([^']*)'\s*\)/g;
    let pbMatch;
    while ((pbMatch = postbackPattern.exec(decodedHtml)) !== null) {
      if (pbMatch[1].includes("ProjectButton") || pbMatch[1].includes("ProjectList")) {
        const start = Math.max(0, pbMatch.index - 300);
        const context = decodedHtml.substring(start, pbMatch.index + pbMatch[0].length + 300);
        if (/ZUBAIR/i.test(context)) {
          selectedPostback = { target: pbMatch[1], argument: pbMatch[2] };
          console.log(`GoHub: Found ZUBAIR ProjectButton postback: target=${pbMatch[1]}`);
          break;
        }
      }
    }
  }

  if (!selectedPostback) {
    console.log("GoHub: WARNING - Could not find project selection postback");
    return { cookies, responseHtml: homePageHtml, responseUrl: homePageUrl };
  }

  // Submit the postback to select the project
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
    const responseHtml = await response.text();
    const result = await followRedirects(
      new URL(location, formAction).toString(), cookies
    );
    console.log(`GoHub: Project selected, redirected to: ${result.url.substring(0, 100)}`);
    return { cookies: result.cookies, responseHtml: result.html, responseUrl: result.url };
  }

  // No redirect - the response IS the updated page
  const responseHtml = await response.text();
  console.log(`GoHub: Project selected (no redirect), response size=${responseHtml.length}`);
  
  // Check if we're now on the home page with the project selected
  const titleMatch = responseHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
  console.log(`GoHub: Post-selection page title: ${titleMatch?.[1]?.trim() || "unknown"}`);

  return { cookies, responseHtml, responseUrl: formAction };
}

// ─── Step 3: Navigate to Completions Grid ────────────────────

async function navigateToCompletionsGrid(
  cookies: Record<string, string>,
  portalUrl: string,
  postSelectionHtml: string,
  postSelectionUrl: string
): Promise<{ html: string; cookies: Record<string, string> }> {
  const parsed = new URL(portalUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC";
  const origin = parsed.origin;

  // Step A: Try to find "Completions Grid" or "SystemCompletion" link in the post-selection page
  const decodedPostHtml = decodeHtmlEntities(postSelectionHtml);
  
  // Look for direct links to SystemCompletion.aspx or CompletionsGrid
  const gridLinkPatterns = [
    /href=["']([^"']*SystemCompletion[^"']*)["']/i,
    /href=["']([^"']*CompletionsGrid[^"']*)["']/i,
    /href=["']([^"']*Completions\s*Grid[^"']*)["']/i,
  ];

  for (const pattern of gridLinkPatterns) {
    const match = postSelectionHtml.match(pattern);
    if (match) {
      const linkHref = decodeHtmlEntities(match[1]);
      console.log(`GoHub: Found Completions Grid link in page: ${linkHref}`);
      const gridUrl = new URL(linkHref, postSelectionUrl).toString();
      console.log(`GoHub: Navigating to: ${gridUrl}`);
      
      const result = await followRedirects(gridUrl, cookies);
      cookies = result.cookies;
      
      if (!result.html.includes("GenericErrorPage") && !result.html.includes("Contact Support")) {
        const titleMatch = result.html.match(/<title[^>]*>([^<]+)<\/title>/i);
        console.log(`GoHub: Grid page title: ${titleMatch?.[1]?.trim() || "unknown"}`);
        return { html: result.html, cookies };
      }
      console.log(`GoHub: Link led to error page, trying alternatives...`);
    }
  }

  // Step B: Look for postback-based "Completions Grid" menu navigation
  const completionsGridPostback = decodedPostHtml.match(
    /__doPostBack\s*\(\s*'([^']+(?:Completions|SystemCompletion)[^']*)'\s*,\s*'([^']*)'\s*\)/i
  );
  if (completionsGridPostback) {
    console.log(`GoHub: Found Completions Grid postback: ${completionsGridPostback[1]}`);
    const hiddenFields = extractHiddenFields(postSelectionHtml);
    const formData: Record<string, string> = {
      ...hiddenFields,
      __EVENTTARGET: completionsGridPostback[1],
      __EVENTARGUMENT: completionsGridPostback[2],
    };
    
    const actionMatch = postSelectionHtml.match(/<form[^>]*action=["']([^"']*?)["'][^>]*>/i);
    const formAction = actionMatch
      ? new URL(decodeHtmlEntities(actionMatch[1]), postSelectionUrl).toString()
      : postSelectionUrl;

    const response = await fetch(formAction, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: formatCookies(cookies),
        "User-Agent": BROWSER_UA,
        Referer: postSelectionUrl,
        Origin: new URL(postSelectionUrl).origin,
      },
      body: new URLSearchParams(formData).toString(),
    });
    cookies = parseCookiesFromResponse(response, cookies);
    const location = response.headers.get("location");
    
    if (location) {
      await response.text();
      const result = await followRedirects(new URL(location, formAction).toString(), cookies);
      cookies = result.cookies;
      if (!result.html.includes("GenericErrorPage")) {
        return { html: result.html, cookies };
      }
    } else {
      const html = await response.text();
      if (!html.includes("GenericErrorPage")) {
        return { html, cookies };
      }
    }
  }

  // Step C: Direct URL attempts with Referer from the post-selection page
  const gridUrls = [
    `${origin}/${instanceName}/GoCompletions/SystemCompletion.aspx`,
    `${origin}/${instanceName}/GoCompletions/SubSystemCompletion.aspx`,
    `${origin}/${instanceName}/GoHub/GoCompletions/SystemCompletion.aspx`,
    `${origin}/${instanceName}/Completions/SystemCompletion.aspx`,
  ];

  for (const gridUrl of gridUrls) {
    try {
      console.log(`GoHub: Trying Completions Grid URL: ${gridUrl}`);
      const response = await fetch(gridUrl, {
        redirect: "manual",
        headers: {
          Cookie: formatCookies(cookies),
          Accept: "text/html",
          "User-Agent": BROWSER_UA,
          Referer: postSelectionUrl,
        },
      });
      cookies = parseCookiesFromResponse(response, cookies);

      const location = response.headers.get("location");
      if (location) {
        await response.text();
        const result = await followRedirects(
          new URL(location, gridUrl).toString(), cookies
        );
        cookies = result.cookies;

        if (result.html.includes("ApplicationLogin") || result.html.includes("Login to")) {
          console.log(`GoHub: ${gridUrl} redirected to login page`);
          continue;
        }
        if (result.html.includes("GenericErrorPage") || result.html.includes("Contact Support")) {
          console.log(`GoHub: ${gridUrl} redirected to error page`);
          continue;
        }

        return { html: result.html, cookies };
      }

      const html = await response.text();

      if (response.status === 404) {
        console.log(`GoHub: ${gridUrl} returned 404`);
        continue;
      }

      if (html.includes("ApplicationLogin") || html.includes("GenericErrorPage") || html.includes("Contact Support")) {
        console.log(`GoHub: ${gridUrl} returned login/error page`);
        continue;
      }

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      console.log(`GoHub: Got page from ${gridUrl}, title: ${titleMatch?.[1]?.trim() || "unknown"}`);

      return { html, cookies };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`GoHub: ${gridUrl} error: ${msg}`);
    }
  }

  // If all else failed, log the post-selection page for debugging
  console.log(`GoHub: Post-selection page snippet: ${decodedPostHtml.substring(0, 3000)}`);

  throw new Error(
    "Could not access the Completions Grid page. " +
    "Project was selected but navigation to the grid failed. " +
    "Check edge function logs for the post-selection page content."
  );
}

// ─── Step 4: Parse Completions Grid HTML ─────────────────────

interface CompletionsSystem {
  system_id: string;
  name: string;
  description: string;
  progress: number;
  is_hydrocarbon: boolean;
}

function parseCompletionsGrid(
  html: string,
  projectFilter: string
): CompletionsSystem[] {
  const systems: CompletionsSystem[] = [];
  const filterUpper = projectFilter.toUpperCase();
  const seen = new Set<string>();

  // Based on the screenshot, the grid shows cards like:
  // ┌──────────────────────────────────┬──────────────┐
  // │ C017-DP300-100                   │   100.00%    │
  // │ GAS                              │              │
  // └──────────────────────────────────┴──────────────┘
  //
  // Each card has a System ID title, description below, and a progress bar

  // Strategy 1: Look for system cards with div/table structure
  // The system ID pattern: Letter + 3 digits + dash + letters/digits + dash + digits
  const systemIdPattern = /([A-Z]\d{2,4}-[A-Z0-9]{2,}-[A-Z0-9-]+)/g;
  const percentPattern = /([\d.]+)\s*%/;

  // Try to find card-like structures
  // Pattern: system ID followed by description and percentage within nearby HTML
  let sysMatch;
  while ((sysMatch = systemIdPattern.exec(html)) !== null) {
    const systemId = sysMatch[1];
    if (seen.has(systemId)) continue;
    if (filterUpper && !systemId.toUpperCase().includes(filterUpper)) continue;

    // Get surrounding context (500 chars before and after)
    const contextStart = Math.max(0, sysMatch.index - 300);
    const contextEnd = Math.min(html.length, sysMatch.index + systemId.length + 500);
    const context = html.substring(contextStart, contextEnd);

    // Extract description/name - look for text near the system ID
    // Usually in a <span>, <div>, <td> or similar near the ID
    const afterId = html.substring(
      sysMatch.index + systemId.length,
      sysMatch.index + systemId.length + 400
    );

    // Find the first meaningful text after the system ID (the description)
    let name = systemId;
    const descMatch = afterId.match(
      /(?:<[^>]*>)*\s*(?:<(?:span|div|td|p|small|br\s*\/?)[\s>])*\s*([A-Za-z][A-Za-z0-9\s\-–—.,&()/']+)/
    );
    if (descMatch && descMatch[1].trim().length > 1) {
      name = descMatch[1].trim().substring(0, 100);
    }

    // Find progress percentage in the context
    let progress = 0;
    const pctMatch = context.match(/([\d.]+)\s*%/);
    if (pctMatch) {
      const val = parseFloat(pctMatch[1]);
      if (val >= 0 && val <= 100) {
        progress = val;
      }
    }

    seen.add(systemId);
    systems.push({
      system_id: systemId,
      name,
      description: "Imported from GoCompletions",
      progress,
      is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon|flare)\b/i.test(name),
    });
  }

  // Strategy 2: Parse table rows if the grid is a <table>
  if (systems.length === 0) {
    console.log("GoHub Parse: No card-based systems found, trying table parsing...");
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
        const idMatch = cells[i].match(/([A-Z]\d{2,4}-[A-Z0-9]{2,}-[A-Z0-9-]+)/);
        if (idMatch && (!filterUpper || idMatch[1].toUpperCase().includes(filterUpper))) {
          if (seen.has(idMatch[1])) continue;
          seen.add(idMatch[1]);

          const sysId = idMatch[1];
          const sysName = cells[i + 1] || sysId;
          let prog = 0;
          for (let j = i + 1; j < cells.length; j++) {
            const pMatch = cells[j].match(/([\d.]+)\s*%?/);
            if (pMatch) {
              const v = parseFloat(pMatch[1]);
              if (v >= 0 && v <= 100) { prog = v; break; }
            }
          }
          systems.push({
            system_id: sysId,
            name: sysName,
            description: "Imported from GoCompletions",
            progress: prog,
            is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon|flare)\b/i.test(sysName),
          });
        }
      }
    }
  }

  // Strategy 3: Parse JSON data if embedded in the page
  if (systems.length === 0) {
    console.log("GoHub Parse: Trying embedded JSON data...");
    const jsonPatterns = [
      /var\s+\w+\s*=\s*(\[[\s\S]*?\]);\s*(?:var|function|<\/script>)/g,
      /data\s*[=:]\s*(\[[\s\S]*?\])[\s;,]/g,
      /items\s*[=:]\s*(\[[\s\S]*?\])[\s;,]/g,
    ];

    for (const pattern of jsonPatterns) {
      let jMatch;
      while ((jMatch = pattern.exec(html)) !== null) {
        try {
          const data = JSON.parse(jMatch[1]);
          if (Array.isArray(data) && data.length > 0) {
            for (const item of data) {
              const sysId = String(item.Name || item.SystemId || item.SubSystemName || "");
              if (!sysId || seen.has(sysId)) continue;
              if (filterUpper && !sysId.toUpperCase().includes(filterUpper)) continue;
              seen.add(sysId);

              systems.push({
                system_id: sysId,
                name: String(item.Description || item.SubSystemDescription || sysId),
                description: "Imported from GoCompletions",
                progress: typeof item.Progress === "number" ? item.Progress :
                  typeof item.OverallProgress === "number" ? item.OverallProgress : 0,
                is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon|flare)\b/i.test(
                  String(item.Description || "")
                ),
              });
            }
          }
        } catch (_) { /* not valid JSON */ }
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
    const { cookies, homePageHtml, homePageUrl } = await webLogin(
      finalPortalUrl, finalUsername, finalPassword
    );
    console.log("GoHub: Login successful");

    // Step 2: Select ZUBAIR (ZB) project
    const { cookies: projectCookies, responseHtml: postSelectionHtml, responseUrl: postSelectionUrl } =
      await selectProject(cookies, homePageHtml, homePageUrl, "ZB");
    console.log("GoHub: Project selection complete");

    // Step 3: Navigate to Completions Grid (using post-selection page for menu links)
    const { html: gridHtml, cookies: gridCookies } = await navigateToCompletionsGrid(
      projectCookies, finalPortalUrl, postSelectionHtml, postSelectionUrl
    );
    console.log(`GoHub: Got Completions Grid HTML, size=${gridHtml.length}`);

    // Log a snippet for debugging
    const cleanGridHtml = gridHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    console.log(`GoHub: Grid page snippet (first 3000 chars): ${cleanGridHtml.substring(0, 3000)}`);

    // Step 4: Parse the grid for systems matching the filter
    const completionsSystems = parseCompletionsGrid(gridHtml, projectFilter);
    console.log(`GoHub: Parsed ${completionsSystems.length} systems matching "${projectFilter}"`);

    if (completionsSystems.length === 0) {
      // Log more of the page for debugging
      console.log(`GoHub: Grid page body (chars 3000-6000): ${cleanGridHtml.substring(3000, 6000)}`);
      console.log(`GoHub: Grid page body (chars 6000-9000): ${cleanGridHtml.substring(6000, 9000)}`);

      throw new Error(
        `No systems matching "${projectFilter}" found on the Completions Grid page. ` +
        `The page was loaded successfully (${gridHtml.length} chars) but no matching system IDs were found. ` +
        `Check edge function logs for page content details.`
      );
    }

    // Step 5: Transform for frontend
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
