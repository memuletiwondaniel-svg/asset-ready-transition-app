/**
 * GoCompletions Shared Auth Module
 * Centralizes ASP.NET login, ViewState extraction, cookie management,
 * ASMX WebMethod calls, and Telerik RadGrid HTML parsing.
 *
 * Used by: test-gocompletions-connection, gohub-import, gohub-sync-counts, fred/handlers
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── Cookie Utilities ────────────────────────────────────────

export function parseCookiesFromResponse(
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

export function formatCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

// ─── HTML Parsing Utilities ──────────────────────────────────

export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function extractHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const regex = /<input[^>]*type=["']hidden["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const tag = match[0];
    const nameMatch = tag.match(/name=["']([^"']*?)["']/);
    const valueMatch = tag.match(/value=["']([^"']*?)["']/);
    if (nameMatch) {
      fields[nameMatch[1]] = valueMatch ? decodeHtmlEntities(valueMatch[1]) : "";
    }
  }
  return fields;
}

/** Follow redirects manually, collecting cookies along the way */
export async function followRedirects(
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

// ─── ASP.NET Web Login ──────────────────────────────────────

export async function loginGoCompletions(
  portalUrl: string,
  username: string,
  password: string
): Promise<{ cookies: Record<string, string>; homePageHtml: string; homePageUrl: string }> {
  let cookies: Record<string, string> = {};

  const { html: loginPageHtml, url: loginPageUrl, cookies: loginCookies } =
    await followRedirects(portalUrl, cookies);
  cookies = loginCookies;

  if (!loginPageHtml) throw new Error("Could not reach the GoHub login page");

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
    if (errorMsgMatch && errorMsgMatch[1].trim())
      throw new Error(`Login failed: ${errorMsgMatch[1].trim()}`);
    if (responseHtml.includes("ApplicationLogin") || responseHtml.includes("Login to"))
      throw new Error("Login failed: Invalid username or password.");
    return { cookies, homePageHtml: responseHtml, homePageUrl: formAction };
  }

  await loginResponse.text();
  const { html: homeHtml, url: homeUrl, cookies: homeCookies } =
    await followRedirects(new URL(postLocation, formAction).toString(), cookies);
  cookies = homeCookies;

  return { cookies, homePageHtml: homeHtml, homePageUrl: homeUrl };
}

// ─── Project Tile Extraction & Selection ─────────────────────

export interface ProjectTile {
  name: string;
  postbackTarget: string;
  postbackArgument: string;
  directUrl?: string;
}

export function extractAllProjectTiles(homePageHtml: string): ProjectTile[] {
  const tiles: ProjectTile[] = [];
  const decodedHtml = decodeHtmlEntities(homePageHtml);

  const tilePattern = /<a[^>]*href=["']javascript:__doPostBack\s*\(\s*(?:&#39;|'|\\')([^'\\&#]+)(?:&#39;|'|\\'),\s*(?:&#39;|'|\\')([^'\\&#]*)(?:&#39;|'|\\')\s*\)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = tilePattern.exec(decodedHtml)) !== null) {
    const target = match[1];
    const argument = match[2];
    const text = match[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (target && text.length > 2 && text.length < 100) {
      tiles.push({ name: text, postbackTarget: target, postbackArgument: argument });
    }
  }

  // Fallback: look for postbacks associated with known project text
  if (tiles.length === 0) {
    const postbackPattern = /__doPostBack\s*\(\s*'([^']+)'\s*,\s*'([^']*)'\s*\)/g;
    let pbMatch;
    while ((pbMatch = postbackPattern.exec(decodedHtml)) !== null) {
      const target = pbMatch[1];
      const argument = pbMatch[2];
      if (target.includes("Project") || target.includes("Repeater") || target.includes("DataList")) {
        const contextStart = Math.max(0, pbMatch.index - 500);
        const contextEnd = Math.min(decodedHtml.length, pbMatch.index + pbMatch[0].length + 500);
        const context = decodedHtml.substring(contextStart, contextEnd);
        const nameMatch = context.match(/(?:BGC\s+)?(?:BNGL|SANDPIT|North\s+Rumaila|South\s+Rumaila|Umm\s+Qasr|West\s+Qurna|Zubair)\s*(?:\([A-Z]{2}\))?/i);
        if (nameMatch && !tiles.some(t => t.postbackTarget === target && t.postbackArgument === argument)) {
          tiles.push({ name: nameMatch[0].trim(), postbackTarget: target, postbackArgument: argument });
        }
      }
    }
  }

  return tiles;
}

export async function selectProjectTile(
  cookies: Record<string, string>,
  homePageHtml: string,
  homePageUrl: string,
  tile: ProjectTile
): Promise<{ cookies: Record<string, string>; responseHtml: string; responseUrl: string }> {
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
    return { cookies: result.cookies, responseHtml: result.html, responseUrl: result.url };
  }

  const responseHtml = await response.text();
  return { cookies, responseHtml, responseUrl: formAction };
}

// ─── Navigate to Completions Grid ────────────────────────────

export async function navigateToCompletionsGrid(
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
      const gridUrl = new URL(linkHref, postSelectionUrl).toString();
      const result = await followRedirects(gridUrl, cookies);
      cookies = result.cookies;
      if (!result.html.includes("GenericErrorPage") && !result.html.includes("Contact Support")) {
        return { html: result.html, url: result.url, cookies };
      }
    }
  }

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

// ─── Navigate to any GoCompletions page ──────────────────────

export async function navigateToPage(
  cookies: Record<string, string>,
  portalUrl: string,
  pagePath: string
): Promise<{ html: string; url: string; cookies: Record<string, string> }> {
  const parsed = new URL(portalUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC";
  const origin = parsed.origin;
  const fullUrl = `${origin}/${instanceName}/${pagePath}`;

  const result = await followRedirects(fullUrl, cookies);
  if (result.html.includes("ApplicationLogin")) {
    throw new Error(`Session expired navigating to ${pagePath}`);
  }
  return result;
}

// ─── ASMX WebMethod Call ─────────────────────────────────────

export function resolveAsmxServiceUrl(gridHtml: string, gridPageUrl: string): string | null {
  const asmxMatch = gridHtml.match(/src=["']([^"']*CompletionsGrid\.asmx)\/js["']/i);
  if (asmxMatch) {
    const relativePath = asmxMatch[1];
    const pageDir = gridPageUrl.replace(/\/[^/]*$/, "/");
    return new URL(relativePath, pageDir).toString();
  }
  return null;
}

export async function callAsmxMethod(
  cookies: Record<string, string>,
  gridPageUrl: string,
  gridHtml: string,
  methodName: string,
  body: Record<string, any> = {}
): Promise<{ data: any; cookies: Record<string, string> }> {
  const asmxBaseUrl = resolveAsmxServiceUrl(gridHtml, gridPageUrl);
  const origin = new URL(gridPageUrl).origin;
  const parsed = new URL(gridPageUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC";

  const urlsToTry: string[] = [];
  if (asmxBaseUrl) urlsToTry.push(`${asmxBaseUrl}/${methodName}`);
  urlsToTry.push(
    `${origin}/${instanceName}/Controls/CompletionsGrid.asmx/${methodName}`,
    `${origin}/${instanceName}/GoCompletions/Controls/CompletionsGrid.asmx/${methodName}`
  );

  for (const url of [...new Set(urlsToTry)]) {
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
        body: JSON.stringify(body),
      });

      const text = await response.text();
      cookies = parseCookiesFromResponse(response, cookies);

      if (response.status === 200 && text.length > 10) {
        let data = JSON.parse(text);
        if (data.d !== undefined) {
          data = typeof data.d === "string" ? JSON.parse(data.d) : data.d;
        }
        return { data, cookies };
      }
    } catch (e) {
      console.log(`ASMX error for ${url}: ${e}`);
    }
  }
  return { data: null, cookies };
}

// ─── POST with ViewState (form submission) ───────────────────

export async function postWithViewState(
  cookies: Record<string, string>,
  pageUrl: string,
  pageHtml: string,
  searchParams: Record<string, string>
): Promise<{ html: string; cookies: Record<string, string> }> {
  const hiddenFields = extractHiddenFields(pageHtml);
  const formData: Record<string, string> = {
    ...hiddenFields,
    ...searchParams,
  };

  const actionMatch = pageHtml.match(/<form[^>]*action=["']([^"']*?)["'][^>]*>/i);
  const formAction = actionMatch
    ? new URL(decodeHtmlEntities(actionMatch[1]), pageUrl).toString()
    : pageUrl;

  const response = await fetch(formAction, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: formatCookies(cookies),
      "User-Agent": BROWSER_UA,
      Referer: pageUrl,
      Origin: new URL(pageUrl).origin,
    },
    body: new URLSearchParams(formData).toString(),
  });
  cookies = parseCookiesFromResponse(response, cookies);
  
  const location = response.headers.get("location");
  if (location) {
    await response.text();
    const result = await followRedirects(new URL(location, formAction).toString(), cookies);
    return { html: result.html, cookies: result.cookies };
  }

  const html = await response.text();
  return { html, cookies };
}

// ─── Telerik RadGrid HTML Parsing ────────────────────────────

export interface GridRow {
  [key: string]: string;
}

export function parseRadGridTable(html: string, headerOverrides?: string[]): GridRow[] {
  const rows: GridRow[] = [];
  
  // Find main grid table — Telerik RadGrid uses <table class="rgMasterTable">
  const tableMatch = html.match(/<table[^>]*class="[^"]*rgMasterTable[^"]*"[^>]*>([\s\S]*?)<\/table>/i)
    || html.match(/<table[^>]*id="[^"]*_GridData[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  
  if (!tableMatch) return rows;
  const tableHtml = tableMatch[1];

  // Extract headers
  const headers: string[] = [];
  const headerRowMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)
    || tableHtml.match(/<tr[^>]*class="[^"]*rgHeader[^"]*"[^>]*>([\s\S]*?)<\/tr>/i);
  
  if (headerRowMatch) {
    const thRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let thMatch;
    while ((thMatch = thRegex.exec(headerRowMatch[1])) !== null) {
      const text = thMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      headers.push(text);
    }
  }

  const effectiveHeaders = headerOverrides || headers;
  if (effectiveHeaders.length === 0) return rows;

  // Extract data rows
  const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const bodyHtml = tbodyMatch ? tbodyMatch[1] : tableHtml;
  
  const rowRegex = /<tr[^>]*class="[^"]*rg(?:Row|AltRow)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(bodyHtml)) !== null) {
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      const text = cellMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      cells.push(decodeHtmlEntities(text));
    }
    if (cells.length > 0) {
      const row: GridRow = {};
      for (let i = 0; i < effectiveHeaders.length && i < cells.length; i++) {
        row[effectiveHeaders[i]] = cells[i];
      }
      rows.push(row);
    }
  }

  return rows;
}

// ─── Extract pagination info ─────────────────────────────────

export function extractPaginationInfo(html: string): { current: number; total: number; perPage: number } {
  const paginationMatch = html.match(/Item\s+(\d+)\s+to\s+(\d+)\s+of\s+([\d,]+)/i);
  if (paginationMatch) {
    const start = parseInt(paginationMatch[1], 10);
    const end = parseInt(paginationMatch[2], 10);
    const total = parseInt(paginationMatch[3].replace(/,/g, ""), 10);
    const perPage = end - start + 1;
    const current = Math.ceil(start / perPage);
    return { current, total, perPage };
  }
  return { current: 1, total: 0, perPage: 20 };
}

// ─── Credential Loader ──────────────────────────────────────

export async function getGoCompletionsCredentials(supabaseClient?: any): Promise<{
  portalUrl: string;
  username: string;
  password: string;
}> {
  const client = supabaseClient || createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: creds, error } = await client
    .from("dms_sync_credentials")
    .select("*")
    .eq("dms_platform", "gocompletions")
    .limit(1)
    .single();

  if (error || !creds) throw new Error("No GoCompletions credentials configured");

  const portalUrl = creds.base_url || "";
  const username = creds.username_encrypted || "";
  const password = String(creds.password_encrypted ?? "");

  if (!portalUrl || !username || !password)
    throw new Error("Incomplete GoCompletions credentials: portal URL, username, and password are required");

  return { portalUrl, username, password };
}

// ─── GocSessionManager ──────────────────────────────────────

const MAX_QUERIES_BEFORE_REFRESH = 30;
const MAX_AGE_MS = 60_000;

export class GocSessionManager {
  private cookies: Record<string, string> = {};
  private gridHtml = "";
  private gridUrl = "";
  private queryCount = 0;
  private sessionStart = 0;
  private portalUrl = "";
  private username = "";
  private password = "";
  private projectCode = "";
  private authenticated = false;

  constructor(portalUrl: string, username: string, password: string, projectCode = "") {
    this.portalUrl = portalUrl;
    this.username = username;
    this.password = password;
    this.projectCode = projectCode;
  }

  async ensureSession(): Promise<void> {
    const now = Date.now();
    const expired = this.authenticated && (
      this.queryCount >= MAX_QUERIES_BEFORE_REFRESH ||
      (now - this.sessionStart) > MAX_AGE_MS
    );

    if (!this.authenticated || expired) {
      console.log(`[GocSession] ${expired ? 'Refreshing' : 'Creating'} session...`);
      const loginResult = await loginGoCompletions(this.portalUrl, this.username, this.password);
      this.cookies = loginResult.cookies;
      this.sessionStart = now;
      this.queryCount = 0;
      this.authenticated = true;

      // Select project if specified
      if (this.projectCode) {
        const tiles = extractAllProjectTiles(loginResult.homePageHtml);
        const tile = tiles.find(t =>
          t.name.toLowerCase().includes(this.projectCode.toLowerCase())
        );
        if (tile) {
          const selResult = await selectProjectTile(
            this.cookies, loginResult.homePageHtml, loginResult.homePageUrl, tile
          );
          this.cookies = selResult.cookies;
        }
      }
    }
  }

  async getGridPage(): Promise<{ html: string; url: string; cookies: Record<string, string> }> {
    await this.ensureSession();
    if (!this.gridHtml) {
      const result = await navigateToCompletionsGrid(
        this.cookies, this.portalUrl, "", ""
      );
      this.gridHtml = result.html;
      this.gridUrl = result.url;
      this.cookies = result.cookies;
    }
    this.queryCount++;
    return { html: this.gridHtml, url: this.gridUrl, cookies: this.cookies };
  }

  async navigateTo(pagePath: string): Promise<{ html: string; url: string; cookies: Record<string, string> }> {
    await this.ensureSession();
    this.queryCount++;
    const result = await navigateToPage(this.cookies, this.portalUrl, pagePath);
    this.cookies = result.cookies;
    return result;
  }

  async callMethod(methodName: string, body: Record<string, any> = {}): Promise<any> {
    const grid = await this.getGridPage();
    const result = await callAsmxMethod(grid.cookies, grid.url, grid.html, methodName, body);
    this.cookies = result.cookies;
    return result.data;
  }

  getCookies(): Record<string, string> { return this.cookies; }
}
