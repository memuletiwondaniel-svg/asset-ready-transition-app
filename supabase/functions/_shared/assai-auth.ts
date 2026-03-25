/**
 * Shared Assai Cloud authentication and helper utilities.
 * Implements browser-like cookie-based login flow against Assai Cloud.
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface AssaiAuthDebugStep {
  step: string;
  status?: number;
  url?: string;
  post_url?: string;
  final_url?: string;
  cookies?: string;
  base_url?: string;
  dbname_used?: string;
  script_session_id?: string;
  script_session_id_used?: string;
  hidden_fields_found?: string[];
  form_body_preview?: string;
  form_body_masked?: string;
  success?: boolean;
  error?: string;
  response_body_preview?: string;
  is_cloudflare_block?: boolean;
}

export interface AssaiLoginResult {
  success: boolean;
  cookies: string;
  message: string;
  responseTimeMs: number;
  debugSteps: AssaiAuthDebugStep[];
}

export interface AssaiDocCountResult {
  success: boolean;
  count: number;
  message: string;
}

export interface ParsedDocument {
  document_number: string;
  revision: string | null;
  status_code: string | null;
  document_title: string | null;
  discipline_code: string | null;
  package_tag: string | null;
  vendor_po_sequence: string | null;
  metadata: Record<string, string | null>;
}

// ──────────────────────────────────────────────
// URL derivation
// ──────────────────────────────────────────────

/**
 * Derive the instance base URL from a stored Platform URL.
 * e.g. https://eu.assaicloud.com/AWeu578/login.aweb → https://eu.assaicloud.com/AWeu578
 */
export function deriveBaseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    const pathParts = url.pathname.split("/").filter(Boolean);
    const tenantCode = pathParts[0] || "";
    if (tenantCode) {
      return `${url.origin}/${tenantCode}`;
    }
    return url.origin;
  } catch {
    let fallback = rawUrl.trim().replace(/\/$/, "");
    const suffixes = ["/login.aweb", "/login", "/index.html", "/home", "/forward.aweb"];
    for (const suffix of suffixes) {
      if (fallback.toLowerCase().endsWith(suffix)) {
        fallback = fallback.slice(0, -suffix.length);
        break;
      }
    }
    return fallback.replace(/\/$/, "");
  }
}

// ──────────────────────────────────────────────
// Cookie management
// ──────────────────────────────────────────────

export function mergeCookies(existing: string, setCookieHeaders: string[]): string {
  const cookieMap = new Map<string, string>();
  if (existing) {
    existing.split(";").forEach((c) => {
      const [k, v] = c.trim().split("=");
      if (k) cookieMap.set(k.trim(), v?.trim() || "");
    });
  }
  setCookieHeaders.forEach((header) => {
    const cookiePart = header.split(";")[0];
    const [k, v] = cookiePart.split("=");
    if (k) cookieMap.set(k.trim(), v?.trim() || "");
  });
  return Array.from(cookieMap.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function getSetCookies(res: Response): string[] {
  const cookies: string[] = [];
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value);
    }
  });
  return cookies;
}

// ──────────────────────────────────────────────
// DWR helpers
// ──────────────────────────────────────────────

export function generateScriptSessionId(): string {
  return (
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase() + "000"
  );
}

// ──────────────────────────────────────────────
// Login form field extraction
// ──────────────────────────────────────────────

function extractLoginFormFields(html: string): Record<string, string> {
  const allowedFields = new Set([
    "isSecure",
    "contentUrl",
    "followUp",
    "ssodata",
    "loginMethod",
    "uniqueName",
    "siteLanguage",
    "loggedOff",
    "isFromLanguageForm",
  ]);

  const fields: Record<string, string> = {};
  const matches = html.matchAll(/<input[^>]+type=["']hidden["'][^>]*>/gi);
  for (const match of matches) {
    const nameMatch = match[0].match(/name=["']([^"']+)["']/i);
    const valueMatch = match[0].match(/value=["']([^"']*?)["']/i);
    if (nameMatch) {
      const name = nameMatch[1];
      if (allowedFields.has(name)) {
        fields[name] = valueMatch ? valueMatch[1] : "";
      }
    }
  }
  return fields;
}

// ──────────────────────────────────────────────
// Project code normalisation
// ──────────────────────────────────────────────

export function normaliseProjectCode(raw: string): string {
  if (!raw) return "";
  let code = raw.trim().toUpperCase();
  if (code.includes("/")) {
    code = code.split("/").pop() || code;
  }
  code = code.replace(/^([A-Z]+)(\d+)$/, "$1-$2");
  return code;
}

// ──────────────────────────────────────────────
// Minimal clean login — 3 steps only
// ──────────────────────────────────────────────

export async function loginAssai(
  baseUrl: string,
  username: string,
  password: string,
  dbname?: string
): Promise<AssaiLoginResult> {
  const startTime = Date.now();
  let cookies = "";
  const debugSteps: AssaiAuthDebugStep[] = [];

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  try {
    console.log('[assai-auth] loginAssai called with:', {
      base_url: baseUrl,
      username_length: (username || '').length,
      password_length: (password || '').length,
      db_name: dbname,
    });

    // Step 1: Get initial session cookie
    console.log("[assai-auth] Step 1: Get initial session cookie");
    const r1 = await fetch(`${baseUrl}/login.aweb`, {
      method: "GET",
      headers,
      redirect: "follow",
    });
    cookies = mergeCookies(cookies, getSetCookies(r1));
    await r1.text();

    debugSteps.push({
      step: "initial_load",
      status: r1.status,
      url: r1.url,
      cookies,
      base_url: baseUrl,
    });
    console.log(`[assai-auth] Step 1: ${r1.status}, url=${r1.url}`);

    // Step 2: Load the username/password form
    console.log("[assai-auth] Step 2: Load login form");
    const r2 = await fetch(`${baseUrl}/login.aweb?loginMethod=unpw&isSecure=true`, {
      method: "GET",
      headers: { ...headers, Cookie: cookies },
      redirect: "follow",
    });
    const html = await r2.text();
    cookies = mergeCookies(cookies, getSetCookies(r2));

    // Extract ONLY login form hidden fields (exclude reset_* and forgetpwd_*)
    const formFields = extractLoginFormFields(html);

    const tenantCode = baseUrl.split("/").filter(Boolean).pop() || "";
    const derivedDbName = tenantCode.replace(/^AW/i, "").toLowerCase();
    const resolvedDbName = (dbname || derivedDbName || "").trim();

    debugSteps.push({
      step: "method_select",
      status: r2.status,
      url: r2.url,
      cookies,
      hidden_fields_found: Object.keys(formFields),
      dbname_used: resolvedDbName,
    });
    console.log(`[assai-auth] Step 2: ${r2.status}, hidden fields=${Object.keys(formFields).join(",")}`);

    // Step 3: Submit login — NO scriptSessionId, NO DWR
    console.log("[assai-auth] Step 3: Submit login POST");
    const loginBodyFields = {
      isSecure: formFields.isSecure ?? "",
      contentUrl: formFields.contentUrl ?? "",
      followUp: formFields.followUp ?? "",
      ssodata: formFields.ssodata ?? "",
      loginMethod: formFields.loginMethod ?? "",
      uniqueName: formFields.uniqueName ?? "",
      siteLanguage: formFields.siteLanguage ?? "",
      loggedOff: formFields.loggedOff ?? "",
      isFromLanguageForm: formFields.isFromLanguageForm ?? "",
      dbname: resolvedDbName,
      userid: username,
      password,
    };

    const body = new URLSearchParams({
      ...loginBodyFields,
    });

    const maskedBody = new URLSearchParams({
      ...loginBodyFields,
      password: "[REDACTED]",
    });

    const origin = new URL(baseUrl).origin;
    const r3 = await fetch(`${baseUrl}/login.aweb`, {
      method: "POST",
      headers: {
        ...headers,
        Cookie: cookies,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": `${baseUrl}/login.aweb?loginMethod=unpw&isSecure=true`,
        "Origin": origin,
      },
      body: body.toString(),
      redirect: "follow",
    });

    cookies = mergeCookies(cookies, getSetCookies(r3));
    const responseText = await r3.text();
    const finalUrl = r3.url || "";
    const success = !finalUrl.toLowerCase().includes("login.aweb");

    // Direct console logs for edge function log visibility
    console.log('[assai-login] POST status:', r3.status);
    console.log('[assai-login] POST final URL:', finalUrl);
    console.log('[assai-login] Response body:', responseText.substring(0, 500));
    console.log('[assai-login] Contains login form:', responseText.includes('id="form"'));
    console.log('[assai-login] Contains forward:', responseText.includes('forward.aweb'));

    debugSteps.push({
      step: "login_post",
      status: r3.status,
      post_url: `${baseUrl}/login.aweb`,
      final_url: finalUrl,
      success,
      cookies,
      form_body_masked: maskedBody.toString(),
    });

    debugSteps.push({
      step: "login_post_body",
      status: r3.status,
      final_url: finalUrl,
      response_body_preview: responseText.substring(0, 1000),
      is_cloudflare_block:
        responseText.includes("cf-challenge") ||
        responseText.includes("Ray ID") ||
        responseText.includes("checking your browser") ||
        responseText.includes("Just a moment"),
    });

    if (!success) {
      console.log(`[assai-auth] Step 3 FAILED: status=${r3.status}, finalUrl=${finalUrl}`);
    } else {
      console.log(`[assai-auth] Step 3 SUCCESS: finalUrl=${finalUrl}`);
    }

    return {
      success,
      cookies,
      message: success
        ? "Authentication successful"
        : "Authentication failed — check username and password",
      responseTimeMs: Date.now() - startTime,
      debugSteps,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Login network error";
    debugSteps.push({ step: "login_exception", error: errorMessage });
    console.error("[assai-auth] Login error:", err);

    return {
      success: false,
      cookies: "",
      message: errorMessage,
      responseTimeMs: Date.now() - startTime,
      debugSteps,
    };
  }
}

// ──────────────────────────────────────────────
// Get document count via DWR
// ──────────────────────────────────────────────

export async function getDocumentCount(
  baseUrl: string,
  cookies: string
): Promise<AssaiDocCountResult> {
  try {
    // First trigger the search
    console.log("[assai-auth] Triggering search...");
    const searchRes = await fetch(
      `${baseUrl}/search.aweb?subclass_type=DES_DOC&search_type=search&execute=true`,
      {
        headers: { "User-Agent": USER_AGENT, Cookie: cookies },
        redirect: "follow",
      }
    );
    cookies = mergeCookies(cookies, getSetCookies(searchRes));
    await searchRes.text();
    console.log(`[assai-auth] Search triggered: ${searchRes.status}`);

    // Load result page to establish context
    const resultRes = await fetch(`${baseUrl}/result.aweb?subclass_type=DES_DOC`, {
      headers: { "User-Agent": USER_AGENT, Cookie: cookies },
      redirect: "follow",
    });
    cookies = mergeCookies(cookies, getSetCookies(resultRes));
    await resultRes.text();

    // DWR call to get row count
    const scriptSessionId = generateScriptSessionId();
    const instancePath = new URL(baseUrl).pathname.replace(/^\//, "");

    const dwrBody = [
      "callCount=1",
      `page=/${instancePath}/result.aweb`,
      "httpSessionId=",
      `scriptSessionId=${scriptSessionId}`,
      "c0-scriptName=DWRBean",
      "c0-methodName=getRowCount",
      "c0-id=0",
      "batchId=0",
    ].join("\n");

    console.log("[assai-auth] DWR getRowCount call...");
    const dwrRes = await fetch(`${baseUrl}/dwr/call/plaincall/DWRBean.getRowCount.dwr`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "User-Agent": USER_AGENT,
        Cookie: cookies,
        Referer: `${baseUrl}/result.aweb`,
      },
      body: dwrBody,
    });

    const dwrText = await dwrRes.text();
    console.log(`[assai-auth] DWR response (first 300): ${dwrText.substring(0, 300)}`);

    // Parse count from response like: value='247'
    const valueMatch = dwrText.match(/value='(\d+)'/);
    const count = valueMatch ? parseInt(valueMatch[1], 10) : 0;

    return {
      success: true,
      count,
      message: `Connected · ${count} documents available`,
    };
  } catch (err) {
    console.error("[assai-auth] getDocumentCount error:", err);
    return {
      success: false,
      count: 0,
      message: err instanceof Error ? err.message : "Session error — could not reach document service",
    };
  }
}

// ──────────────────────────────────────────────
// Fetch and parse document table from result.aweb
// ──────────────────────────────────────────────

export async function fetchAndParseDocuments(
  baseUrl: string,
  cookies: string
): Promise<{ documents: ParsedDocument[]; error: string | null; rawRowCount: number }> {
  try {
    // Trigger search
    console.log("[assai-parse] Triggering search...");
    const searchRes = await fetch(
      `${baseUrl}/search.aweb?subclass_type=DES_DOC&search_type=search&execute=true`,
      {
        headers: { "User-Agent": USER_AGENT, Cookie: cookies },
        redirect: "follow",
      }
    );
    cookies = mergeCookies(cookies, getSetCookies(searchRes));
    await searchRes.text();

    // Fetch result page
    console.log("[assai-parse] Fetching result page...");
    let resultRes = await fetch(`${baseUrl}/result.aweb?subclass_type=DES_DOC`, {
      headers: { "User-Agent": USER_AGENT, Cookie: cookies },
      redirect: "follow",
    });
    let html = await resultRes.text();
    console.log(`[assai-parse] Result page: ${resultRes.status}, length: ${html.length}`);

    // Fallback if empty
    if (html.length < 500) {
      resultRes = await fetch(`${baseUrl}/result.aweb`, {
        headers: { "User-Agent": USER_AGENT, Cookie: cookies },
        redirect: "follow",
      });
      html = await resultRes.text();
      console.log(`[assai-parse] Fallback result page: ${resultRes.status}, length: ${html.length}`);
    }

    // Parse document rows
    const documents = parseDocumentTable(html);
    console.log(`[assai-parse] Parsed ${documents.length} documents`);

    if (documents.length === 0 && html.length > 500) {
      return {
        documents: [],
        error: "Document table not found — Assai page structure may have changed",
        rawRowCount: 0,
      };
    }

    return { documents, error: null, rawRowCount: documents.length };
  } catch (err) {
    console.error("[assai-parse] Error:", err);
    return {
      documents: [],
      error: err instanceof Error ? err.message : "Failed to fetch documents",
      rawRowCount: 0,
    };
  }
}

// ──────────────────────────────────────────────
// HTML table parser
// ──────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

// Document number pattern: digits-letters-... (at least 2 hyphen-separated parts)
const DOC_NUMBER_PATTERN = /\d{4}-[A-Z]+/;

function parseDocumentTable(html: string): ParsedDocument[] {
  const documents: ParsedDocument[] = [];

  // Split by table rows
  const rows = html.split(/<\/tr>/i);

  for (const row of rows) {
    // Split by table cells
    const cellMatches = row.split(/<\/td>/i);
    if (cellMatches.length < 6) continue;

    // Extract cell text content
    const cells = cellMatches.map((c) => stripHtml(c));

    // Check if col 0 matches a document number pattern
    const docNum = cells[0] || "";
    if (!DOC_NUMBER_PATTERN.test(docNum)) continue;

    const rawWorkPackage = cells[12] || "";

    documents.push({
      document_number: docNum,
      revision: cells[1] || null,
      status_code: cells[3] || null,
      document_title: cells[5] || null,
      discipline_code: cells[10] || null,
      package_tag: normaliseProjectCode(rawWorkPackage),
      vendor_po_sequence: cells[13] || null,
      metadata: {
        rev_date: cells[2] || null,
        approval: cells[4] || null,
        priority: cells[6] || null,
        originator: cells[7] || null,
        responsible_engineer: cells[8] || null,
        company_code: cells[9] || null,
        document_type: cells[11] || null,
        assai_work_package_code: rawWorkPackage || null,
        purchase_order: cells[13] || null,
        classification: cells[14] || null,
        company_document_nr: cells[15] || null,
        planned_start: cells[16] || null,
        forecast_start: cells[17] || null,
        actual_start: cells[18] || null,
        planned_end: cells[19] || null,
        forecast_end: cells[20] || null,
        actual_end: cells[21] || null,
        project_code: cells[22] || null,
        project_title: cells[23] || null,
        asset_item: cells[24] || null,
        external_refs: cells[25] || null,
        subclass_code: cells[26] || null,
        language: cells[27] || null,
      },
    });
  }

  return documents;
}
