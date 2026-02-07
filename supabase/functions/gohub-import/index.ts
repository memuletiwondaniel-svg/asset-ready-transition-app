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
): Promise<Record<string, string>> {
  console.log(`GoHub: Looking for project "${projectCode}" on home page...`);

  // The project tiles are likely links or postback buttons.
  // Look for a link containing the project code (e.g., "ZUBAIR (ZB)")
  // Pattern 1: Direct <a> link to the project
  const linkPatterns = [
    // Match links with ZUBAIR or ZB in text
    new RegExp(`<a[^>]*href=["']([^"']+)["'][^>]*>[^<]*(?:ZUBAIR|${projectCode})[^<]*<`, "i"),
    // Match onclick postback with project selection
    new RegExp(`<[^>]*(?:onclick|href)=["']([^"']*(?:ZUBAIR|${projectCode})[^"']*)["']`, "i"),
    // Match any element containing ZUBAIR in its attributes
    new RegExp(`href=["']([^"']*Level[^"']*(?:ZUBAIR|ZB)[^"']*)["']`, "i"),
  ];

  for (const pattern of linkPatterns) {
    const match = homePageHtml.match(pattern);
    if (match) {
      console.log(`GoHub: Found project link: ${match[1].substring(0, 200)}`);
    }
  }

  // Decode HTML entities first so postback patterns match
  const decodedHtml = decodeHtmlEntities(homePageHtml);

  // Look for ASP.NET postback pattern: __doPostBack('ctl00$...','levelId')
  const postbackPattern = /__doPostBack\s*\(\s*'([^']+)'\s*,\s*'([^']*)'\s*\)/g;
  const postbacks: { target: string; argument: string; context: string }[] = [];
  let pbMatch;
  while ((pbMatch = postbackPattern.exec(decodedHtml)) !== null) {
    const start = Math.max(0, pbMatch.index - 200);
    const context = decodedHtml.substring(start, pbMatch.index + pbMatch[0].length + 200);
    postbacks.push({ target: pbMatch[1], argument: pbMatch[2], context });
  }

  console.log(`GoHub: Found ${postbacks.length} postbacks on home page`);

  // Find the postback for ZUBAIR (ZB)
  let selectedPostback: { target: string; argument: string } | null = null;

  for (const pb of postbacks) {
    if (/ZUBAIR|ZB\)/i.test(pb.context)) {
      console.log(`GoHub: Found ZUBAIR postback: target=${pb.target}, arg=${pb.argument}`);
      selectedPostback = pb;
      break;
    }
  }

  // Also look for direct links to select the project
  const directLinkMatch = homePageHtml.match(
    /href=["']([^"']*(?:SelectLevel|SetLevel|ChangeLevel|ProjectSelect)[^"']*(?:ZUBAIR|ZB)[^"']*)["']/i
  );
  if (directLinkMatch) {
    console.log(`GoHub: Found direct project link: ${directLinkMatch[1]}`);
    const projectUrl = new URL(directLinkMatch[1].replace(/&amp;/g, "&"), homePageUrl).toString();
    const response = await fetch(projectUrl, {
      redirect: "manual",
      headers: {
        Cookie: formatCookies(cookies),
        Accept: "text/html",
        "User-Agent": BROWSER_UA,
        Referer: homePageUrl,
      },
    });
    cookies = parseCookiesFromResponse(response, cookies);
    const location = response.headers.get("location");
    await response.text();
    if (location) {
      const { cookies: newCookies } = await followRedirects(
        new URL(location, projectUrl).toString(), cookies
      );
      cookies = newCookies;
    }
    console.log("GoHub: Project selected via direct link");
    return cookies;
  }

  // Also look for image-based links (the project tiles with logos)
  // Pattern: <a href="..."><img .../></a> with ZUBAIR text nearby
  const tileLinkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]{0,500}?ZUBAIR/gi;
  const tileMatch = tileLinkPattern.exec(homePageHtml);
  if (tileMatch) {
    const tileHref = decodeHtmlEntities(tileMatch[1]);
    console.log(`GoHub: Found ZUBAIR tile link (decoded): ${tileHref}`);

    // Check if it's a postback
    if (tileHref.includes("__doPostBack") || tileHref.startsWith("javascript:")) {
      const pbExtract = tileHref.match(/__doPostBack\s*\(\s*'([^']+)'\s*,\s*'([^']*)'\s*\)/);
      if (pbExtract) {
        selectedPostback = { target: pbExtract[1], argument: pbExtract[2] };
        console.log(`GoHub: Extracted postback: target=${pbExtract[1]}`);
      }
    } else {
      // Direct URL
      const projectUrl = new URL(tileHref, homePageUrl).toString();
      console.log(`GoHub: Navigating to project URL: ${projectUrl}`);
      const { cookies: newCookies } = await followRedirects(projectUrl, cookies);
      cookies = newCookies;
      console.log("GoHub: Project selected via tile link");
      return cookies;
    }
  }

  // If we found a postback, submit it
  if (selectedPostback) {
    console.log(`GoHub: Submitting project selection postback...`);
    const hiddenFields = extractHiddenFields(homePageHtml);

    const formData: Record<string, string> = {
      ...hiddenFields,
      __EVENTTARGET: selectedPostback.target,
      __EVENTARGUMENT: selectedPostback.argument,
    };

    const actionMatch = homePageHtml.match(/<form[^>]*action=["']([^"']*?)["'][^>]*>/i);
    const formAction = actionMatch
      ? new URL(actionMatch[1].replace(/&amp;/g, "&"), homePageUrl).toString()
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
    await response.text();

    if (location) {
      const { cookies: newCookies } = await followRedirects(
        new URL(location, formAction).toString(), cookies
      );
      cookies = newCookies;
    }

    console.log("GoHub: Project selected via postback");
    return cookies;
  }

  // Fallback: Just log what we found on the page for debugging
  // Look for any clickable elements near "ZUBAIR"
  const zubairIndex = homePageHtml.toUpperCase().indexOf("ZUBAIR");
  if (zubairIndex >= 0) {
    const surrounding = homePageHtml.substring(
      Math.max(0, zubairIndex - 500),
      Math.min(homePageHtml.length, zubairIndex + 500)
    );
    console.log(`GoHub: HTML around ZUBAIR: ${surrounding}`);
  } else {
    console.log("GoHub: WARNING - 'ZUBAIR' not found on home page!");
    // Log first 2000 chars for debugging
    console.log(`GoHub: Home page snippet: ${homePageHtml.substring(0, 2000)}`);
  }

  console.log("GoHub: Could not find project selection mechanism, proceeding anyway...");
  return cookies;
}

// ─── Step 3: Navigate to Completions Grid ────────────────────

async function navigateToCompletionsGrid(
  cookies: Record<string, string>,
  portalUrl: string
): Promise<{ html: string; cookies: Record<string, string> }> {
  const parsed = new URL(portalUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC";
  const origin = parsed.origin;

  // The Completions Grid URL based on the navigation structure shown
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
        },
      });
      cookies = parseCookiesFromResponse(response, cookies);

      const location = response.headers.get("location");
      if (location) {
        await response.text();
        // Follow redirect
        const { html, cookies: newCookies } = await followRedirects(
          new URL(location, gridUrl).toString(), cookies
        );
        cookies = newCookies;

        if (html.includes("ApplicationLogin") || html.includes("Login to")) {
          console.log(`GoHub: ${gridUrl} redirected to login page`);
          continue;
        }

        console.log(`GoHub: Got Completions Grid page (via redirect), size=${html.length}`);
        return { html, cookies };
      }

      const html = await response.text();

      if (response.status === 404) {
        console.log(`GoHub: ${gridUrl} returned 404`);
        continue;
      }

      if (html.includes("ApplicationLogin") || html.includes("Login to")) {
        console.log(`GoHub: ${gridUrl} redirected to login`);
        continue;
      }

      if (html.includes("Error") && html.length < 500) {
        console.log(`GoHub: ${gridUrl} returned error page: ${html.substring(0, 200)}`);
        continue;
      }

      console.log(`GoHub: Got Completions Grid page, size=${html.length}`);
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      console.log(`GoHub: Page title: ${titleMatch?.[1] || "none"}`);

      return { html, cookies };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`GoHub: ${gridUrl} error: ${msg}`);
    }
  }

  throw new Error(
    "Could not access the Completions Grid page. " +
    "All known URLs returned errors or redirected to login."
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
    const projectCookies = await selectProject(cookies, homePageHtml, homePageUrl, "ZB");
    console.log("GoHub: Project selection complete");

    // Step 3: Navigate to Completions Grid
    const { html: gridHtml, cookies: gridCookies } = await navigateToCompletionsGrid(
      projectCookies, finalPortalUrl
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
