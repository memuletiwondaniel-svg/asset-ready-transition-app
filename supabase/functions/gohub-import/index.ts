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

/** Strip large hidden field values to reveal actual page content */
function stripHiddenFieldValues(html: string): string {
  return html.replace(
    /(<input[^>]*type=["']hidden["'][^>]*value=["'])[^"']{100,}(["'][^>]*>)/gi,
    "$1[STRIPPED]$2"
  );
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

  if (!loginPageHtml) {
    throw new Error("Could not reach the GoHub login page");
  }

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
  projectCode: string
): Promise<{ cookies: Record<string, string>; responseHtml: string; responseUrl: string }> {
  console.log(`GoHub: Looking for project "${projectCode}" on home page...`);

  const decodedHtml = decodeHtmlEntities(homePageHtml);

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
      const projectUrl = new URL(tileHref, homePageUrl).toString();
      const result = await followRedirects(projectUrl, cookies);
      return { cookies: result.cookies, responseHtml: result.html, responseUrl: result.url };
    }
  }

  // Method 2: Search all postbacks for one containing ProjectButton near ZUBAIR
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
    const result = await followRedirects(
      new URL(location, formAction).toString(), cookies
    );
    console.log(`GoHub: Project selected, redirected to: ${result.url.substring(0, 100)}`);
    return { cookies: result.cookies, responseHtml: result.html, responseUrl: result.url };
  }

  const responseHtml = await response.text();
  console.log(`GoHub: Project selected (no redirect), response size=${responseHtml.length}`);
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

  // Try to find "Completions Grid" link in the post-selection page
  const gridLinkPatterns = [
    /href=["']([^"']*CompletionsGrid[^"']*)["']/i,
    /href=["']([^"']*SystemCompletion[^"']*)["']/i,
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
        return { html: result.html, url: result.url, cookies };
      }
      console.log(`GoHub: Link led to error page, trying alternatives...`);
    }
  }

  // Direct URL attempts
  const gridUrls = [
    `${origin}/${instanceName}/GoCompletions/Completions/CompletionsGrid.aspx`,
    `${origin}/${instanceName}/GoCompletions/SystemCompletion.aspx`,
    `${origin}/${instanceName}/GoCompletions/SubSystemCompletion.aspx`,
  ];

  for (const gridUrl of gridUrls) {
    try {
      console.log(`GoHub: Trying Completions Grid URL: ${gridUrl}`);
      const result = await followRedirects(gridUrl, cookies);
      cookies = result.cookies;

      if (result.html.includes("ApplicationLogin") || result.html.includes("GenericErrorPage")) {
        console.log(`GoHub: ${gridUrl} returned login/error page`);
        continue;
      }

      const titleMatch = result.html.match(/<title[^>]*>([^<]+)<\/title>/i);
      console.log(`GoHub: Got page from ${gridUrl}, title: ${titleMatch?.[1]?.trim() || "unknown"}`);
      return { html: result.html, url: result.url, cookies };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`GoHub: ${gridUrl} error: ${msg}`);
    }
  }

  throw new Error("Could not access the Completions Grid page.");
}

// ─── Step 4: Try REST API Endpoints ──────────────────────────

interface CompletionsSystem {
  system_id: string;
  name: string;
  description: string;
  progress: number;
  is_hydrocarbon: boolean;
}

async function tryRestApi(
  cookies: Record<string, string>,
  origin: string,
  instanceName: string,
  projectFilter: string,
  gridPageUrl: string
): Promise<CompletionsSystem[]> {
  const filterUpper = projectFilter.toUpperCase();

  // List of API endpoints to try (GoTechnology REST API patterns)
  const apiEndpoints = [
    // SubSystem API with filter
    `${origin}/${instanceName}/api/SubSystem?ps=500&Name:con=${projectFilter}`,
    `${origin}/${instanceName}/api/SubSystem?ps=500`,
    // CompletionsGrid API patterns
    `${origin}/${instanceName}/GoCompletions/api/SubSystem?ps=500`,
    `${origin}/${instanceName}/GoCompletions/api/SystemCompletion?ps=500`,
    `${origin}/${instanceName}/GoCompletions/Completions/api/SubSystem?ps=500`,
    // Generic completions API
    `${origin}/${instanceName}/api/SystemCompletion?ps=500`,
    `${origin}/${instanceName}/api/CompletionsGrid?ps=500`,
  ];

  for (const apiUrl of apiEndpoints) {
    try {
      console.log(`GoHub API: Trying ${apiUrl}`);
      const response = await fetch(apiUrl, {
        headers: {
          Cookie: formatCookies(cookies),
          Accept: "application/json, text/json, */*",
          "User-Agent": BROWSER_UA,
          "X-Requested-With": "XMLHttpRequest",
          Referer: gridPageUrl,
        },
      });

      if (response.status === 404 || response.status === 403 || response.status === 401) {
        console.log(`GoHub API: ${apiUrl} returned ${response.status}`);
        await response.text();
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      const responseText = await response.text();

      // Check pagination header
      const paginationHeader = response.headers.get("X-Pagination");
      if (paginationHeader) {
        console.log(`GoHub API: X-Pagination: ${paginationHeader}`);
      }

      // Check if it's JSON
      if (contentType.includes("json") || responseText.trim().startsWith("[") || responseText.trim().startsWith("{")) {
        console.log(`GoHub API: Got JSON response (${responseText.length} chars) from ${apiUrl}`);

        try {
          let data = JSON.parse(responseText);

          // Handle wrapped responses { Items: [...] } or { data: [...] }
          if (!Array.isArray(data)) {
            if (Array.isArray(data.Items)) data = data.Items;
            else if (Array.isArray(data.data)) data = data.data;
            else if (Array.isArray(data.results)) data = data.results;
            else if (Array.isArray(data.Systems)) data = data.Systems;
            else {
              console.log(`GoHub API: Response is object with keys: ${Object.keys(data).join(", ")}`);
              continue;
            }
          }

          console.log(`GoHub API: Parsed ${data.length} items from ${apiUrl}`);
          if (data.length > 0) {
            console.log(`GoHub API: Sample item keys: ${Object.keys(data[0]).join(", ")}`);
            console.log(`GoHub API: Sample item: ${JSON.stringify(data[0]).substring(0, 500)}`);
          }

          const systems: CompletionsSystem[] = [];
          const seen = new Set<string>();

          for (const item of data) {
            // Try various field name conventions
            const sysId = String(
              item.Name || item.SubSystemName || item.SystemId ||
              item.System_Id || item.system_id || item.SubSystemId ||
              item.SubSystem_Id || item.Code || ""
            );
            if (!sysId) continue;
            if (seen.has(sysId)) continue;
            if (filterUpper && !sysId.toUpperCase().includes(filterUpper)) continue;

            seen.add(sysId);

            const description = String(
              item.Description || item.SubSystemDescription ||
              item.SystemDescription || item.Desc || sysId
            );

            let progress = 0;
            const progValue =
              item.Progress ?? item.OverallProgress ?? item.Overall_Progress ??
              item.CompletionPercentage ?? item.Completion ?? item.Percent;
            if (typeof progValue === "number") {
              progress = progValue;
            } else if (typeof progValue === "string") {
              const parsed = parseFloat(progValue);
              if (!isNaN(parsed)) progress = parsed;
            }

            systems.push({
              system_id: sysId,
              name: description,
              description: "Imported from GoCompletions",
              progress,
              is_hydrocarbon: /\b(gas|oil|fuel|hydrocarbon|flare)\b/i.test(description),
            });
          }

          if (systems.length > 0) {
            console.log(`GoHub API: Found ${systems.length} systems matching "${projectFilter}" from ${apiUrl}`);
            return systems;
          } else {
            console.log(`GoHub API: No systems matching "${projectFilter}" in ${data.length} items from ${apiUrl}`);
          }
        } catch (parseErr) {
          console.log(`GoHub API: JSON parse error for ${apiUrl}: ${parseErr}`);
        }
      } else {
        // Not JSON - might be HTML redirect to login
        if (responseText.includes("ApplicationLogin")) {
          console.log(`GoHub API: ${apiUrl} returned login page`);
        } else {
          console.log(`GoHub API: ${apiUrl} returned non-JSON (${contentType}, ${responseText.length} chars)`);
          // Log a snippet
          console.log(`GoHub API: Response snippet: ${responseText.substring(0, 300)}`);
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`GoHub API: ${apiUrl} error: ${msg}`);
    }
  }

  return [];
}

// ─── Step 5: Parse Completions Grid HTML ─────────────────────

function parseCompletionsGrid(
  html: string,
  projectFilter: string
): CompletionsSystem[] {
  const systems: CompletionsSystem[] = [];
  const filterUpper = projectFilter.toUpperCase();
  const seen = new Set<string>();

  // The system ID pattern: Letter + digits + dash + letters/digits + dash + more
  const systemIdPattern = /([A-Z]\d{2,4}-[A-Z0-9]{2,}-[A-Z0-9-]+)/g;

  let sysMatch;
  while ((sysMatch = systemIdPattern.exec(html)) !== null) {
    const systemId = sysMatch[1];
    if (seen.has(systemId)) continue;
    if (filterUpper && !systemId.toUpperCase().includes(filterUpper)) continue;

    const contextStart = Math.max(0, sysMatch.index - 300);
    const contextEnd = Math.min(html.length, sysMatch.index + systemId.length + 500);
    const context = html.substring(contextStart, contextEnd);

    const afterId = html.substring(
      sysMatch.index + systemId.length,
      sysMatch.index + systemId.length + 400
    );

    let name = systemId;
    const descMatch = afterId.match(
      /(?:<[^>]*>)*\s*(?:<(?:span|div|td|p|small|br\s*\/?)[\s>])*\s*([A-Za-z][A-Za-z0-9\s\-–—.,&()/']+)/
    );
    if (descMatch && descMatch[1].trim().length > 1) {
      name = descMatch[1].trim().substring(0, 100);
    }

    let progress = 0;
    const pctMatch = context.match(/([\d.]+)\s*%/);
    if (pctMatch) {
      const val = parseFloat(pctMatch[1]);
      if (val >= 0 && val <= 100) progress = val;
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

  // Strategy 2: Parse table rows
  if (systems.length === 0) {
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

  // Strategy 3: Parse embedded JSON
  if (systems.length === 0) {
    const jsonPatterns = [
      /var\s+\w+\s*=\s*(\[[\s\S]*?\]);\s*(?:var|function|<\/script>)/g,
      /data\s*[=:]\s*(\[[\s\S]*?\])[\s;,]/g,
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

// ─── Step 6: Try ScriptManager / UpdatePanel partial postback ─

async function tryPartialPostback(
  cookies: Record<string, string>,
  gridHtml: string,
  gridUrl: string
): Promise<CompletionsSystem[]> {
  console.log("GoHub: Trying ASP.NET UpdatePanel partial postback...");

  const hiddenFields = extractHiddenFields(gridHtml);

  // Look for ScriptManager ID
  const smMatch = gridHtml.match(/Sys\.WebForms\.PageRequestManager\._initialize\s*\(\s*'([^']+)'/);
  const scriptManagerId = smMatch ? smMatch[1] : null;
  console.log(`GoHub: ScriptManager ID: ${scriptManagerId || "not found"}`);

  // Look for UpdatePanel IDs
  const upMatches = [...gridHtml.matchAll(/updatePanelIDs['"]*\s*[:=]\s*['"]*([^'";\]]+)/gi)];
  const updatePanelIds = upMatches.map(m => m[1]).filter(Boolean);
  console.log(`GoHub: UpdatePanel IDs: ${updatePanelIds.join(", ") || "none found"}`);

  // Look for any __doPostBack calls that might trigger data loading
  const decodedGrid = decodeHtmlEntities(gridHtml);
  const postbackTargets: string[] = [];
  const pbRegex = /__doPostBack\s*\(\s*'([^']+)'\s*,\s*'([^']*)'\s*\)/g;
  let pbMatch;
  while ((pbMatch = pbRegex.exec(decodedGrid)) !== null) {
    postbackTargets.push(pbMatch[1]);
  }
  console.log(`GoHub: Found ${postbackTargets.length} postback targets on grid page`);
  if (postbackTargets.length > 0) {
    console.log(`GoHub: Postback targets: ${postbackTargets.slice(0, 10).join(", ")}`);
  }

  // Try a partial postback using ScriptManager
  if (scriptManagerId) {
    const actionMatch = gridHtml.match(/<form[^>]*action=["']([^"']*?)["'][^>]*>/i);
    const formAction = actionMatch
      ? new URL(decodeHtmlEntities(actionMatch[1]), gridUrl).toString()
      : gridUrl;

    // Try each postback target to see if one loads data
    for (const target of postbackTargets.slice(0, 5)) {
      try {
        const formData: Record<string, string> = {
          ...hiddenFields,
          __EVENTTARGET: target,
          __EVENTARGUMENT: "",
          __ASYNCPOST: "true",
          [scriptManagerId]: `${target}|${target}`,
        };

        const response = await fetch(formAction, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: formatCookies(cookies),
            "User-Agent": BROWSER_UA,
            "X-MicrosoftAjax": "Delta=true",
            "X-Requested-With": "XMLHttpRequest",
            Referer: gridUrl,
            Origin: new URL(gridUrl).origin,
          },
          body: new URLSearchParams(formData).toString(),
        });

        const text = await response.text();
        cookies = parseCookiesFromResponse(response, cookies);

        // Check if the response contains system IDs
        if (text.includes("DP300") || text.includes("DP228") || text.includes("DP109")) {
          console.log(`GoHub: Partial postback to "${target}" returned data with system IDs! (${text.length} chars)`);
          // Parse the partial response for systems
          const systems = parseCompletionsGrid(text, "DP300");
          if (systems.length > 0) {
            return systems;
          }
        }
      } catch (_) {
        // Continue trying other targets
      }
    }
  }

  return [];
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

    // Step 2: Select ZUBAIR project
    const { cookies: projectCookies, responseHtml: postSelectionHtml, responseUrl: postSelectionUrl } =
      await selectProject(cookies, homePageHtml, homePageUrl, "ZB");
    console.log("GoHub: Project selection complete");

    // Step 3: Navigate to Completions Grid
    const { html: gridHtml, url: gridPageUrl, cookies: gridCookies } = await navigateToCompletionsGrid(
      projectCookies, finalPortalUrl, postSelectionHtml, postSelectionUrl
    );
    console.log(`GoHub: Got Completions Grid HTML, size=${gridHtml.length}`);

    // Diagnostics: strip hidden fields and check what's actually on the page
    const strippedHtml = stripHiddenFieldValues(gridHtml);
    const containsDP300 = gridHtml.includes("DP300");
    const containsDP228 = gridHtml.includes("DP228");
    const containsDP109 = gridHtml.includes("DP109");
    console.log(`GoHub: HTML contains DP300=${containsDP300}, DP228=${containsDP228}, DP109=${containsDP109}`);
    console.log(`GoHub: Stripped HTML (first 2000): ${strippedHtml.substring(0, 2000)}`);
    console.log(`GoHub: Stripped HTML size: ${strippedHtml.length} (original: ${gridHtml.length})`);

    // Log any script sources (to find AJAX endpoints)
    const scriptSrcMatches = [...gridHtml.matchAll(/src=["']([^"']*\.js[^"']*)["']/gi)];
    console.log(`GoHub: Script sources: ${scriptSrcMatches.map(m => m[1]).join(", ")}`);

    // Log inline script content (look for API URLs)
    const inlineScripts = [...gridHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
    for (let i = 0; i < inlineScripts.length; i++) {
      const content = inlineScripts[i][1].trim();
      if (content.length > 10 && content.length < 5000) {
        console.log(`GoHub: Inline script ${i} (${content.length} chars): ${content.substring(0, 1000)}`);
      } else if (content.length >= 5000) {
        console.log(`GoHub: Inline script ${i} (${content.length} chars, truncated): ${content.substring(0, 1000)}`);
      }
    }

    // Step 4: Try HTML parsing first
    let completionsSystems = parseCompletionsGrid(gridHtml, projectFilter);
    console.log(`GoHub: HTML parsing found ${completionsSystems.length} systems`);

    // Step 5: If no systems in HTML, try REST API endpoints
    if (completionsSystems.length === 0) {
      console.log("GoHub: No systems in HTML, trying REST API endpoints...");
      const parsedUrl = new URL(finalPortalUrl);
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
      const instanceName = pathParts[0] || "BGC";

      completionsSystems = await tryRestApi(
        gridCookies, parsedUrl.origin, instanceName, projectFilter, gridPageUrl
      );
    }

    // Step 6: If REST API also failed, try partial postback (UpdatePanel)
    if (completionsSystems.length === 0) {
      console.log("GoHub: REST API failed, trying partial postback...");
      completionsSystems = await tryPartialPostback(gridCookies, gridHtml, gridPageUrl);
    }

    // Step 7: Log remaining HTML for debugging if still nothing
    if (completionsSystems.length === 0) {
      // Log the page content after hidden fields to help debug
      const afterHidden = strippedHtml.replace(/<input[^>]*>/gi, "");
      console.log(`GoHub: Page without inputs (last 3000): ${afterHidden.substring(Math.max(0, afterHidden.length - 3000))}`);

      throw new Error(
        `No systems matching "${projectFilter}" found. ` +
        `The Completions Grid page loaded (title OK, ${gridHtml.length} chars) but the grid data appears to be loaded dynamically via JavaScript. ` +
        `REST API endpoints were also tried but none returned matching data. ` +
        `Check edge function logs for detailed diagnostics.`
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
