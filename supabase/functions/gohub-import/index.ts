import { createClient } from "jsr:@supabase/supabase-js@2";

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

// ─── Step 2: Extract ALL project tiles from home page ────────

interface ProjectTile {
  name: string;
  postbackTarget: string;
  postbackArgument: string;
  /** Optional direct URL if it's a regular link */
  directUrl?: string;
}

function extractAllProjectTiles(homePageHtml: string): ProjectTile[] {
  const tiles: ProjectTile[] = [];
  const decodedHtml = decodeHtmlEntities(homePageHtml);

  // Pattern 1: Look for <a> tags with __doPostBack that contain project names
  // These tiles typically have text like "BGC BNGL (NR)", "ZUBAIR (ZB)", etc.
  const tilePattern = /<a[^>]*href=["']javascript:__doPostBack\s*\(\s*(?:&#39;|'|\\')([^'\\&#]+)(?:&#39;|'|\\'),\s*(?:&#39;|'|\\')([^'\\&#]*)(?:&#39;|'|\\')\s*\)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = tilePattern.exec(decodedHtml)) !== null) {
    const target = match[1];
    const argument = match[2];
    const innerHtml = match[3];
    
    // Extract visible text from the tile
    const text = innerHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    
    // Only include tiles that look like project tiles (not navigation or login links)
    if (target && text.length > 2 && text.length < 100) {
      tiles.push({
        name: text,
        postbackTarget: target,
        postbackArgument: argument,
      });
    }
  }

  // Pattern 2: Look for postbacks associated with known project-like text
  // This catches cases where the HTML structure is different
  if (tiles.length === 0) {
    const postbackPattern = /__doPostBack\s*\(\s*'([^']+)'\s*,\s*'([^']*)'\s*\)/g;
    let pbMatch;
    while ((pbMatch = postbackPattern.exec(decodedHtml)) !== null) {
      const target = pbMatch[1];
      const argument = pbMatch[2];
      
      // Look for project name text near this postback
      const contextStart = Math.max(0, pbMatch.index - 500);
      const contextEnd = Math.min(decodedHtml.length, pbMatch.index + pbMatch[0].length + 500);
      const context = decodedHtml.substring(contextStart, contextEnd);
      
      // Check if this looks like a project selector (has ProjectButton, ProjectList, etc.)
      if (target.includes("Project") || target.includes("Repeater") || target.includes("DataList")) {
        // Try to extract project name from nearby text
        const namePatterns = [
          /(?:BGC\s+)?(?:BNGL|SANDPIT|North\s+Rumaila|South\s+Rumaila|Umm\s+Qasr|West\s+Qurna|Zubair)\s*(?:\([A-Z]{2}\))?/i,
          /\b([A-Z][A-Za-z\s]+)\s*\(([A-Z]{2})\)/,
        ];
        
        for (const namePattern of namePatterns) {
          const nameMatch = context.match(namePattern);
          if (nameMatch) {
            const name = nameMatch[0].trim();
            // Avoid duplicates
            if (!tiles.some(t => t.postbackTarget === target && t.postbackArgument === argument)) {
              tiles.push({ name, postbackTarget: target, postbackArgument: argument });
            }
            break;
          }
        }
      }
    }
  }

  console.log(`GoHub: Found ${tiles.length} project tiles: ${tiles.map(t => t.name).join(", ")}`);
  return tiles;
}

// ─── Step 2b: Select a specific project tile ────────────────

async function selectProjectTile(
  cookies: Record<string, string>,
  homePageHtml: string,
  homePageUrl: string,
  tile: ProjectTile
): Promise<{ cookies: Record<string, string>; responseHtml: string; responseUrl: string }> {
  console.log(`GoHub: Selecting project: ${tile.name}`);

  if (tile.directUrl) {
    const result = await followRedirects(tile.directUrl, cookies);
    return { cookies: result.cookies, responseHtml: result.html, responseUrl: result.url };
  }

  const hiddenFields = extractHiddenFields(homePageHtml);
  const formData: Record<string, string> = {
    ...hiddenFields,
    __EVENTTARGET: tile.postbackTarget,
    __EVENTARGUMENT: tile.postbackArgument,
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
    console.log(`GoHub: Project "${tile.name}" selected, redirected to: ${result.url.substring(0, 100)}`);
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

// ─── Resolve ASMX service URL from page HTML ────────────────

function resolveAsmxServiceUrl(gridHtml: string, gridPageUrl: string): string | null {
  const asmxMatch = gridHtml.match(/src=["']([^"']*CompletionsGrid\.asmx)\/js["']/i);
  if (asmxMatch) {
    const relativePath = asmxMatch[1];
    const pageDir = gridPageUrl.replace(/\/[^/]*$/, "/");
    const resolved = new URL(relativePath, pageDir).toString();
    console.log(`GoHub: Resolved ASMX service URL: ${resolved} (from relative: ${relativePath})`);
    return resolved;
  }
  return null;
}

// ─── Strategy 1: ASMX WebMethod (correct endpoint) ─────────

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
  
  if (asmxBaseUrl) {
    urlsToTry.push(`${asmxBaseUrl}/GetSystems`);
  }
  
  urlsToTry.push(
    `${origin}/${instanceName}/Controls/CompletionsGrid.asmx/GetSystems`,
    `${origin}/${instanceName}/GoCompletions/Controls/CompletionsGrid.asmx/GetSystems`,
  );

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

        if (status === 200 && text.length > 50) {
          const systems = parsePageMethodResponse(text);
          if (systems.length > 0) {
            console.log(`GoHub: ASMX WebMethod returned ${systems.length} systems!`);
            return systems;
          }
        }

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

// ─── Fetch subsystems for each system via ASMX GetSubSystems ─
async function enrichSystemsWithSubsystems(
  systems: CompletionsSystem[],
  cookies: Record<string, string>,
  gridPageUrl: string,
  gridHtml: string,
): Promise<CompletionsSystem[]> {
  // Only enrich systems that have no subsystems yet
  const systemsToEnrich = systems.filter(s => s.subsystems.length === 0);
  if (systemsToEnrich.length === 0) return systems;

  const asmxBaseUrl = resolveAsmxServiceUrl(gridHtml, gridPageUrl);
  const origin = new URL(gridPageUrl).origin;
  const parsed = new URL(gridPageUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC";

  // Build candidate URLs for GetSubSystems
  const urlsToTry: string[] = [];
  if (asmxBaseUrl) {
    urlsToTry.push(`${asmxBaseUrl}/GetSubSystems`);
  }
  urlsToTry.push(
    `${origin}/${instanceName}/Controls/CompletionsGrid.asmx/GetSubSystems`,
    `${origin}/${instanceName}/GoCompletions/Controls/CompletionsGrid.asmx/GetSubSystems`,
  );
  const uniqueUrls = [...new Set(urlsToTry)];

  // Try the first working URL with the first system to validate the endpoint
  let workingUrl: string | null = null;
  const testSystem = systemsToEnrich[0];

  for (const url of uniqueUrls) {
    try {
      // Try different parameter formats
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
        console.log(`GoHub: GetSubSystems test: url=${url}, params=${JSON.stringify(params)}, status=${response.status}, length=${text.length}`);

        if (response.status === 200 && text.length > 10) {
          // Try to parse and see if it looks like subsystem data
          try {
            let parsed = JSON.parse(text);
            if (parsed.d !== undefined) {
              parsed = typeof parsed.d === "string" ? JSON.parse(parsed.d) : parsed.d;
            }
            if (!Array.isArray(parsed)) {
              for (const key of ["Items", "data", "results", "Systems", "systems", "Data"]) {
                if (parsed[key] && Array.isArray(parsed[key])) {
                  parsed = parsed[key];
                  break;
                }
              }
            }
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`GoHub: GetSubSystems SUCCESS! Found ${parsed.length} subsystems for "${testSystem.system_id}". Keys: ${Object.keys(parsed[0]).join(", ")}`);
              console.log(`GoHub: First subsystem RAW: ${JSON.stringify(parsed[0]).substring(0, 500)}`);
              workingUrl = url;

              // Parse subsystems for the test system
              testSystem.subsystems = parseSubsystemsResponse(parsed);
              break;
            }
          } catch (_) {
            // Not valid JSON
          }
        }
      }
      if (workingUrl) break;
    } catch (e) {
      console.log(`GoHub: GetSubSystems error for ${url}: ${e}`);
    }
  }

  if (!workingUrl) {
    console.log("GoHub: GetSubSystems endpoint not available - subsystems will be inferred from hierarchy");
    return systems;
  }

  // Fetch subsystems for remaining systems (skip the test system)
  const remaining = systemsToEnrich.filter(s => s !== testSystem);
  console.log(`GoHub: Enriching ${remaining.length} more systems with subsystems...`);

  // Process in batches of 5 to avoid overwhelming the server
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
            let parsed = JSON.parse(text);
            if (parsed.d !== undefined) {
              parsed = typeof parsed.d === "string" ? JSON.parse(parsed.d) : parsed.d;
            }
            if (!Array.isArray(parsed)) {
              for (const key of ["Items", "data", "results", "Systems", "systems", "Data"]) {
                if (parsed[key] && Array.isArray(parsed[key])) {
                  parsed = parsed[key];
                  break;
                }
              }
            }
            if (Array.isArray(parsed)) {
              system.subsystems = parseSubsystemsResponse(parsed);
            }
          } catch (_) { /* skip */ }
        }
      } catch (_) { /* skip individual failures */ }
    }));
  }

  const enrichedCount = systems.filter(s => s.subsystems.length > 0).length;
  console.log(`GoHub: Subsystem enrichment complete — ${enrichedCount}/${systems.length} systems have subsystems`);

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
    console.log(`GoHub: PageMethod response: status=${response.status}, length=${text.length}`);

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

  if (systems.length > 0) {
    console.log(`GoHub: Extracted ${systems.length} systems from HTML`);
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
        if (data[key] && Array.isArray(data[key])) {
          data = data[key];
          break;
        }
      }
    }

    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch (_) { /* not JSON */ }
    }

    if (Array.isArray(data)) {
      console.log(`GoHub: Parsed JSON array with ${data.length} items`);
      if (data.length > 0) {
        console.log(`GoHub: First item keys: ${Object.keys(data[0]).join(", ")}`);
        // Log raw first item to understand exact data structure
        const firstItem = data[0];
        console.log(`GoHub: RAW first item: ${JSON.stringify(firstItem).substring(0, 1500)}`);
        // Log first 5 system IDs to understand naming patterns
        const sampleIds = data.slice(0, 5).map((d: any) => d.Number || d.SystemNumber || d.Id || 'unknown');
        console.log(`GoHub: Sample system IDs: ${JSON.stringify(sampleIds)}`);
      }

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

        // Parse SubSystem field - handle multiple formats
        let rawSubSystems = item.SubSystem ?? item.SubSystems ?? item.subsystems ?? item.Children ?? [];
        const parsedSubsystems: CompletionsSubsystem[] = [];

        // If it's a string, try to parse it as JSON
        if (typeof rawSubSystems === 'string') {
          try { rawSubSystems = JSON.parse(rawSubSystems); } catch (_) { rawSubSystems = []; }
        }

        // If it's an object with a nested array (e.g., {Items: [...]} or {d: [...]})
        if (rawSubSystems && typeof rawSubSystems === 'object' && !Array.isArray(rawSubSystems)) {
          for (const key of ['Items', 'data', 'results', 'd', 'SubSystems', 'Children']) {
            if (Array.isArray(rawSubSystems[key])) {
              rawSubSystems = rawSubSystems[key];
              break;
            }
          }
          // If still not an array, wrap single object as array
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
              const parsed = parseFloat(String(subPctValue).replace('%', ''));
              if (!isNaN(parsed)) {
                subProgress = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
              }
            }

            parsedSubsystems.push({
              system_id: subId,
              name: subName,
              progress: subProgress,
            });
          }
        }

        if (parsedSubsystems.length > 0 && systems.length === 0) {
          console.log(`GoHub: First system "${sysId}" has ${parsedSubsystems.length} subsystems parsed`);
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
      subsystems: [],
    });
  }

  return systems;
}

// ─── Search a single GoHub project for matching systems ─────

async function searchProjectForSystems(
  cookies: Record<string, string>,
  homePageHtml: string,
  homePageUrl: string,
  portalUrl: string,
  tile: ProjectTile,
  projectFilter: string
): Promise<{ systems: CompletionsSystem[]; cookies: Record<string, string> }> {
  try {
    // Select the project
    const { cookies: projectCookies, responseHtml, responseUrl } =
      await selectProjectTile(cookies, homePageHtml, homePageUrl, tile);

    // Navigate to Completions Grid
    const { html: gridHtml, url: gridPageUrl, cookies: gridCookies } =
      await navigateToCompletionsGrid(projectCookies, portalUrl, responseHtml, responseUrl);

    let allSystems: CompletionsSystem[] = [];

    // Strategy 1: ASMX WebMethod
    allSystems = await tryAsmxWebMethod(gridCookies, gridPageUrl, gridHtml);

    // Strategy 2: PageMethod
    if (allSystems.length === 0) {
      allSystems = await tryPageMethod(gridCookies, gridPageUrl);
    }

    // Strategy 3: HTML extraction
    if (allSystems.length === 0) {
      allSystems = extractFromHtml(gridHtml);
    }

    console.log(`GoHub: Project "${tile.name}" returned ${allSystems.length} total systems`);

    // Enrich systems with subsystems via separate API call
    if (allSystems.length > 0) {
      const needsEnrichment = allSystems.some(s => s.subsystems.length === 0);
      if (needsEnrichment) {
        console.log(`GoHub: Attempting to enrich ${allSystems.length} systems with subsystems...`);
        allSystems = await enrichSystemsWithSubsystems(allSystems, gridCookies, gridPageUrl, gridHtml);
      }
    }

    // Filter by project code
    if (allSystems.length > 0 && projectFilter) {
      const filterUpper = projectFilter.toUpperCase();
      const filtered = allSystems.filter(s => s.system_id.toUpperCase().includes(filterUpper));
      console.log(`GoHub: Filtered to ${filtered.length} systems matching "${projectFilter}" in "${tile.name}"`);
      
      // Tag each system with which GoHub project it came from
      for (const sys of filtered) {
        sys.source_project = tile.name;
      }
      
      return { systems: filtered, cookies: gridCookies };
    }

    return { systems: [], cookies: gridCookies };
  } catch (error) {
    console.error(`GoHub: Error searching project "${tile.name}":`, error);
    // Continue to next project rather than failing entirely
    return { systems: [], cookies };
  }
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
        JSON.stringify({ success: false, error: "Project code is required for GoHub import. Ensure your ORSH project has a valid project code." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const { cookies: loginCookies, homePageHtml, homePageUrl } = await webLogin(finalPortalUrl, finalUsername, finalPassword);
    console.log("GoHub: Login successful");

    // Step 2: Extract ALL project tiles from the home page
    const allTiles = extractAllProjectTiles(homePageHtml);

    if (allTiles.length === 0) {
      console.log("GoHub: No project tiles found on home page. Attempting direct grid access...");
      // Fallback: try accessing the completions grid directly (maybe user is already in a project context)
      try {
        const { html: gridHtml, url: gridPageUrl, cookies: gridCookies } =
          await navigateToCompletionsGrid(loginCookies, finalPortalUrl, homePageHtml, homePageUrl);

        let systems = await tryAsmxWebMethod(gridCookies, gridPageUrl, gridHtml);
        if (systems.length === 0) systems = await tryPageMethod(gridCookies, gridPageUrl);
        if (systems.length === 0) systems = extractFromHtml(gridHtml);

        const filterUpper = projectFilter.toUpperCase();
        const filtered = systems.filter(s => s.system_id.toUpperCase().includes(filterUpper));

        if (filtered.length > 0) {
          // Infer hierarchy for direct fallback too
          const sortedDirect = [...filtered].sort(
            (a, b) => a.system_id.length - b.system_id.length || a.system_id.localeCompare(b.system_id)
          );
          const directParentMap = new Map<string, CompletionsSystem>();
          const directChildIds = new Set<string>();
          for (const sys of sortedDirect) {
            let matched = false;
            for (const [pId, parent] of directParentMap) {
              if (sys.system_id.length > pId.length && sys.system_id.startsWith(pId) && /[-_.]/.test(sys.system_id.charAt(pId.length))) {
                parent.subsystems.push({ system_id: sys.system_id, name: sys.name, progress: sys.progress });
                directChildIds.add(sys.system_id);
                matched = true;
                break;
              }
            }
            if (!matched) directParentMap.set(sys.system_id, sys);
          }
          const topLevel = filtered.filter(s => !directChildIds.has(s.system_id));

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

      throw new Error("No project tiles found on the GoHub home page. Please verify you can access GoHub and see project tiles.");
    }

    // Step 3: Search ALL projects for systems matching the project code
    console.log(`GoHub: Will search ${allTiles.length} projects for systems matching "${projectFilter}"`);
    
    const allMatchingSystems: CompletionsSystem[] = [];
    const searchedProjects: string[] = [];
    const projectsWithResults: string[] = [];
    let currentCookies = loginCookies;

    for (let i = 0; i < allTiles.length; i++) {
      const tile = allTiles[i];
      console.log(`GoHub: Searching project ${i + 1}/${allTiles.length}: "${tile.name}"`);
      searchedProjects.push(tile.name);

      // Re-fetch home page to get fresh hidden fields for each iteration
      // (except for the first one, where we already have the home page)
      let currentHomeHtml = homePageHtml;
      let currentHomeUrl = homePageUrl;

      if (i > 0) {
        try {
          const { html, url, cookies: refreshedCookies } = await followRedirects(finalPortalUrl, currentCookies);
          currentCookies = refreshedCookies;
          currentHomeHtml = html;
          currentHomeUrl = url;
          
          // Re-extract tiles to get fresh postback targets
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
        currentCookies,
        currentHomeHtml,
        currentHomeUrl,
        finalPortalUrl,
        tile,
        projectFilter
      );

      currentCookies = updatedCookies;

      if (matchedSystems.length > 0) {
        allMatchingSystems.push(...matchedSystems);
        projectsWithResults.push(tile.name);
        console.log(`GoHub: Found ${matchedSystems.length} matching systems in "${tile.name}"!`);
      }
    }

    console.log(`GoHub: Search complete. Found ${allMatchingSystems.length} total matching systems across ${projectsWithResults.length} projects`);

    if (allMatchingSystems.length === 0) {
      throw new Error(
        `No systems matching "${projectFilter}" found across ${searchedProjects.length} GoHub projects ` +
        `(${searchedProjects.join(", ")}). ` +
        `Verify the project code matches system IDs in GoCompletions.`
      );
    }

    // Deduplicate by system_id (same system could theoretically appear in multiple projects)
    const seen = new Set<string>();
    const uniqueSystems = allMatchingSystems.filter(sys => {
      if (seen.has(sys.system_id)) return false;
      seen.add(sys.system_id);
      return true;
    });

    // ─── Infer parent-child hierarchy from system IDs ───────────
    // GoHub often returns a flat list. We group by detecting when one
    // system_id is a prefix of another (e.g., C017-DP300-403 is parent
    // of C017-DP300-403-01). Sort by ID length so parents come first.
    const sorted = [...uniqueSystems].sort(
      (a, b) => a.system_id.length - b.system_id.length || a.system_id.localeCompare(b.system_id)
    );

    const parentMap = new Map<string, CompletionsSystem>(); // system_id → parent system
    const childIds = new Set<string>(); // IDs that are subsystems

    for (const sys of sorted) {
      // Check if this system's ID starts with any existing parent ID + separator
      let foundParent = false;
      for (const [parentId, parent] of parentMap) {
        // Child ID must start with parent ID followed by a separator (-_ or similar)
        if (
          sys.system_id.length > parentId.length &&
          sys.system_id.startsWith(parentId) &&
          /[-_.]/.test(sys.system_id.charAt(parentId.length))
        ) {
          // This is a subsystem of the parent
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
      // If this wasn't matched as a child, register it as a potential parent
      if (!foundParent) {
        // Merge any explicit subsystems it already had
        parentMap.set(sys.system_id, sys);
      }
    }

    // Only return top-level systems (filter out children)
    const topLevelSystems = uniqueSystems.filter(sys => !childIds.has(sys.system_id));

    console.log(
      `GoHub: Hierarchy built — ${topLevelSystems.length} parent systems, ${childIds.size} subsystems grouped`
    );

    // Transform for frontend
    const systems = topLevelSystems.map((sys, index) => ({
      id: `gohub-${Date.now()}-${index}`,
      system_id: sys.system_id,
      name: sys.name,
      description: sys.description,
      is_hydrocarbon: sys.is_hydrocarbon,
      progress: sys.progress,
      subsystems: sys.subsystems || [],
      source: "gohub",
      source_project: sys.source_project,
    }));

    console.log(`GoHub import: SUCCESS - ${systems.length} unique systems found matching "${projectFilter}"`);

    return new Response(
      JSON.stringify({
        success: true,
        systems,
        total: systems.length,
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
