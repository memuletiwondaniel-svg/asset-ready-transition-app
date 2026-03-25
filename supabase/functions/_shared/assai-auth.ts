/**
 * Shared Assai Cloud authentication and helper utilities.
 * Implements browser-like cookie-based login flow against Assai Cloud.
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface AssaiLoginResult {
  success: boolean;
  cookies: string;
  message: string;
  responseTimeMs: number;
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
  let url = rawUrl.trim().replace(/\/$/, "");
  const suffixes = ["/login.aweb", "/login", "/index.html", "/home", "/forward.aweb"];
  for (const suffix of suffixes) {
    if (url.toLowerCase().endsWith(suffix)) {
      url = url.slice(0, -suffix.length);
      break;
    }
  }
  return url.replace(/\/$/, "");
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
// Project code normalisation
// ──────────────────────────────────────────────

export function normaliseProjectCode(raw: string): string {
  if (!raw) return "";
  let code = raw.trim().toUpperCase();
  // Strip known prefixes before slash (e.g. "ST/DP189" → "DP189")
  if (code.includes("/")) {
    code = code.split("/").pop() || code;
  }
  // Insert hyphen between letters and numbers (e.g. "DP189" → "DP-189")
  code = code.replace(/^([A-Z]+)(\d+)$/, "$1-$2");
  return code;
}

// ──────────────────────────────────────────────
// Three-step browser-like login
// ──────────────────────────────────────────────

export async function loginAssai(
  baseUrl: string,
  username: string,
  password: string
): Promise<AssaiLoginResult> {
  const startTime = Date.now();
  let cookies = "";

  try {
    // Request A — Initial page load
    console.log("[assai-auth] Step A: Loading login page");
    const resA = await fetch(`${baseUrl}/login.aweb`, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    cookies = mergeCookies(cookies, getSetCookies(resA));
    await resA.text(); // drain body
    console.log(`[assai-auth] Step A: ${resA.status}, cookies: ${cookies.substring(0, 100)}`);

    // Request B — Select password method
    console.log("[assai-auth] Step B: Selecting login method");
    const resB = await fetch(`${baseUrl}/login.aweb?loginMethod=unpw&isSecure=true`, {
      headers: {
        "User-Agent": USER_AGENT,
        Cookie: cookies,
      },
      redirect: "follow",
    });
    cookies = mergeCookies(cookies, getSetCookies(resB));
    await resB.text(); // drain body
    console.log(`[assai-auth] Step B: ${resB.status}`);

    // Request C — Submit credentials
    console.log("[assai-auth] Step C: Submitting credentials");
    const formBody = new URLSearchParams({
      userid: username,
      password: password,
      loginMethod: "unpw",
      isSecure: "false",
      contentUrl: "./forward.aweb?page=root/body",
      followUp: "null",
      ssodata: "null",
      uniqueName: "",
    }).toString();

    const resC = await fetch(`${baseUrl}/login.aweb`, {
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

    console.log(`[assai-auth] Step C: ${resC.status}, finalUrl: ${finalUrl.substring(0, 120)}`);
    console.log(`[assai-auth] Step C body (first 300): ${bodyC.substring(0, 300)}`);

    // Check success: final URL should NOT contain login.aweb
    const isSuccess =
      (finalUrl.includes("forward.aweb") ||
        finalUrl.includes("navbar.aweb") ||
        finalUrl.includes("index.aweb") ||
        !finalUrl.includes("login.aweb")) &&
      resC.status >= 200 &&
      resC.status < 400;

    // Also check body — if it still shows login form, it failed
    const bodyIndicatesLogin =
      bodyC.includes('name="userid"') || bodyC.includes("loginMethod=unpw");
    const loginSuccess = isSuccess && !bodyIndicatesLogin;

    return {
      success: loginSuccess,
      cookies,
      message: loginSuccess
        ? "Authentication successful"
        : "Authentication failed — check username and password",
      responseTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    console.error("[assai-auth] Login error:", err);
    return {
      success: false,
      cookies: "",
      message: err instanceof Error ? err.message : "Login network error",
      responseTimeMs: Date.now() - startTime,
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
