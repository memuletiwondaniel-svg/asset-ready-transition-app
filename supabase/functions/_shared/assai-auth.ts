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
  const fields: Record<string, string> = {};
  const matches = html.matchAll(/<input[^>]+type=["']hidden["'][^>]*>/gi);
  for (const match of matches) {
    const nameMatch = match[0].match(/name=["']([^"']+)["']/i);
    const valueMatch = match[0].match(/value=["']([^"']*?)["']/i);
    if (nameMatch) {
      const name = nameMatch[1];
      // Only include main login form fields
      if (!name.startsWith('reset_') && !name.startsWith('forgetpwd_')) {
        fields[name] = valueMatch ? valueMatch[1] : '';
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
// Hidden field extraction
// ──────────────────────────────────────────────

function extractHiddenFields(html: string): Record<string, string> {
  const hiddenFields: Record<string, string> = {};
  const hiddenInputs = html.match(/<input[^>]+type=["']hidden["'][^>]*>/gi) || [];

  for (const input of hiddenInputs) {
    const nameMatch = input.match(/name=["']([^"']+)["']/i);
    const valueMatch = input.match(/value=["']([^"']*?)["']/i);
    const fieldName = nameMatch?.[1]?.trim();
    if (!fieldName) continue;
    hiddenFields[fieldName] = valueMatch?.[1] ?? "";
  }

  return hiddenFields;
}

// ──────────────────────────────────────────────
// Three-step browser-like login
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

  try {
    // Request A — Initial page load
    console.log("[assai-auth] Step A: Loading login page");
    const resA = await fetch(`${baseUrl}/login.aweb`, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    const bodyA = await resA.text();
    cookies = mergeCookies(cookies, getSetCookies(resA));

    debugSteps.push({
      step: "initial_load",
      status: resA.status,
      cookies,
      url: resA.url,
      base_url: baseUrl,
    });

    console.log(`[assai-auth] Step A: ${resA.status}, url=${resA.url}`);
    console.log(`[assai-auth] Step A body (first 200): ${bodyA.substring(0, 200)}`);

    // Request B — Select password method
    console.log("[assai-auth] Step B: Selecting login method");
    const resB = await fetch(`${baseUrl}/login.aweb?loginMethod=unpw&isSecure=true`, {
      headers: {
        "User-Agent": USER_AGENT,
        Cookie: cookies,
      },
      redirect: "follow",
    });
    const bodyB = await resB.text();
    cookies = mergeCookies(cookies, getSetCookies(resB));

    // Extract hidden fields dynamically (includes CSRF-like fields)
    const hiddenFields = extractHiddenFields(bodyB);

    const loginFields = Object.fromEntries(
      Object.entries(hiddenFields).filter(([key]) => {
        const lowered = key.toLowerCase();
        return !lowered.startsWith("reset_") && !lowered.startsWith("forgetpwd_");
      })
    );

    const tenantCode = baseUrl.split("/").filter(Boolean).pop() || "";
    const derivedDbName = tenantCode.replace(/^AW/i, "").toLowerCase();
    const resolvedDbName = (dbname || hiddenFields["reset_dbname"] || derivedDbName || "").trim();

    const methodSelectStepIndex = debugSteps.length;
    debugSteps.push({
      step: "method_select",
      status: resB.status,
      url: resB.url,
      cookies,
      hidden_fields_found: Object.keys(hiddenFields),
      dbname_used: resolvedDbName,
    });

    console.log(`[assai-auth] Step B: ${resB.status}, hidden fields=${Object.keys(hiddenFields).join(",")}`);

    // Request B2 — Establish DWR session ID required by login flow
    console.log("[assai-auth] Step B2: Establishing DWR session");
    const tenantPath = new URL(baseUrl).pathname.replace(/\/+$/, "") || `/${tenantCode}`;
    const generatedScriptSessionId = generateScriptSessionId();
    const dwrSessionBody = [
      "callCount=1",
      `page=${tenantPath}/login.aweb`,
      "httpSessionId=",
      `scriptSessionId=${generatedScriptSessionId}`,
      "c0-scriptName=DWRBean",
      "c0-methodName=getSessionID",
      "c0-id=0",
      "batchId=0",
    ].join("\n");

    const dwrSessionUrl = `${baseUrl}/dwr/call/plaincall/DWRBean.getSessionID.dwr`;
    const resB2 = await fetch(dwrSessionUrl, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "text/plain",
        Cookie: cookies,
        Referer: `${baseUrl}/login.aweb?loginMethod=unpw&isSecure=true`,
      },
      body: dwrSessionBody,
      redirect: "follow",
    });
    const bodyB2 = await resB2.text();
    cookies = mergeCookies(cookies, getSetCookies(resB2));

    const realSessionIdMatch = bodyB2.match(/_remoteHandleCallback\([^)]*,\s*"([^"]+)"\s*\)/);
    const realScriptSessionId = realSessionIdMatch?.[1] || generatedScriptSessionId;

    debugSteps.push({
      step: "dwr_session",
      status: resB2.status,
      url: dwrSessionUrl,
      script_session_id: realScriptSessionId,
      cookies,
    });

    const formParams = new URLSearchParams();
    for (const [k, v] of Object.entries(loginFields)) {
      formParams.set(k, v);
    }

    const requiredDefaults: Record<string, string> = {
      isSecure: "false",
      contentUrl: "./forward.aweb?page=root/body",
      followUp: "null",
      ssodata: "null",
      loginMethod: "unpw",
      uniqueName: "",
      siteLanguage: "",
      loggedOff: "true",
      isFromLanguageForm: "true",
    };

    for (const [key, value] of Object.entries(requiredDefaults)) {
      if (!formParams.has(key)) {
        formParams.set(key, value);
      }
    }

    if (resolvedDbName) {
      formParams.set("dbname", resolvedDbName);
    }
    formParams.set("scriptSessionId", realScriptSessionId);
    formParams.set("userid", username);
    formParams.set("password", password);

    const formBody = formParams.toString();
    const maskedParams = new URLSearchParams(formParams);
    maskedParams.set("password", "[REDACTED]");
    const maskedFormBody = maskedParams.toString();

    debugSteps[methodSelectStepIndex] = {
      ...debugSteps[methodSelectStepIndex],
      form_body_preview: maskedFormBody.substring(0, 200),
      form_body_masked: maskedFormBody,
    };

    // Request C — Submit credentials
    console.log("[assai-auth] Step C: Submitting credentials");
    const loginPostUrl = `${baseUrl}/login.aweb`;
    const resC = await fetch(loginPostUrl, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
        Referer: `${baseUrl}/login.aweb?loginMethod=unpw&isSecure=true`,
      },
      body: formBody,
      redirect: "follow",
    });

    cookies = mergeCookies(cookies, getSetCookies(resC));
    const bodyC = await resC.text();
    const finalUrl = resC.url || "";

    const loginSuccess =
      resC.status >= 200 &&
      resC.status < 400 &&
      !finalUrl.toLowerCase().includes("login.aweb");

    debugSteps.push({
      step: "login_post",
      status: resC.status,
      post_url: loginPostUrl,
      final_url: finalUrl,
      success: loginSuccess,
      script_session_id_used: realScriptSessionId,
      cookies,
    });

    console.log(`[assai-auth] Step C: ${resC.status}, finalUrl=${finalUrl}`);
    console.log(`[assai-auth] Step C success=${loginSuccess}, body (first 300): ${bodyC.substring(0, 300)}`);

    return {
      success: loginSuccess,
      cookies,
      message: loginSuccess
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
