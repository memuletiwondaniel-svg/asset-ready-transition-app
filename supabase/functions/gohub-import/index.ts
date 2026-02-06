import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PAGE_SIZE = 100;

// ─── Types ───────────────────────────────────────────────────

interface GoHubRecord {
  ID?: string;
  Name: string;
  Description?: string;
  System?: { Name?: string; Description?: string };
  Phase?: { Name?: string };
  Priority?: { Name?: string };
  [key: string]: unknown;
}

interface GoHubPagedResponse {
  Items?: GoHubRecord[];
  TotalItems?: number;
  PageSize?: number;
  PageNumber?: number;
  TotalPages?: number;
}

type AuthResult =
  | { type: "token"; token: string }
  | { type: "cookies"; cookies: Record<string, string> };

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
      const [nameValue] = combined.split(";");
      const eqIndex = nameValue.indexOf("=");
      if (eqIndex > 0) {
        cookies[nameValue.substring(0, eqIndex).trim()] =
          nameValue.substring(eqIndex + 1).trim();
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
        ? valueMatch[1].replace(/&amp;/g, "&")
        : "";
    }
  }
  return fields;
}

// ─── Auth: GoHub ASP.NET Web Login ──────────────────────────
// GoHub uses a classic ASP.NET WebForms login page at /BGC/Login.aspx
// Form fields (discovered from page HTML):
//   - ApplicationLogin$UserName
//   - ApplicationLogin$Password
//   - ApplicationLogin$LoginButton (submit button, value="Log In")
//   - ASP.NET hidden fields: __VIEWSTATE, __EVENTVALIDATION, etc.

async function authWebLogin(
  portalUrl: string,
  username: string,
  password: string
): Promise<Record<string, string>> {
  console.log("GoHub Auth: Starting web login...");
  let cookies: Record<string, string> = {};

  // Step 1: Navigate to portal → follow redirects to Login.aspx
  let url = portalUrl;
  let loginPageHtml = "";
  let loginPageUrl = "";

  for (let i = 0; i < 10; i++) {
    console.log(`GoHub Auth: Step ${i + 1}: GET ${url.substring(0, 120)}`);
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        Cookie: formatCookies(cookies),
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    cookies = parseCookiesFromResponse(response, cookies);
    const location = response.headers.get("location");

    if (location) {
      await response.text();
      url = new URL(location, url).toString();
      continue;
    }
    loginPageHtml = await response.text();
    loginPageUrl = url;
    break;
  }

  if (!loginPageHtml) {
    throw new Error("Could not reach the GoHub login page");
  }

  console.log(
    `GoHub Auth: Login page at ${loginPageUrl.substring(0, 80)}, size=${loginPageHtml.length}`
  );

  // Step 2: Parse ASP.NET hidden fields (__VIEWSTATE, etc.)
  const hiddenFields = extractHiddenFields(loginPageHtml);
  console.log(
    `GoHub Auth: Hidden fields: ${Object.keys(hiddenFields).join(", ")}`
  );

  // Step 3: Detect form field names from the actual HTML
  // GoHub uses ASP.NET names like "ApplicationLogin$UserName"
  let userField = "ApplicationLogin$UserName";
  let passField = "ApplicationLogin$Password";
  let buttonField = "ApplicationLogin$LoginButton";
  let buttonValue = "Log In";

  // Try to auto-detect from HTML if different
  const userInputMatch = loginPageHtml.match(
    /name=["']([\w$]+UserName[\w$]*)["']/i
  );
  const passInputMatch = loginPageHtml.match(
    /name=["']([\w$]+Password[\w$]*)["']/i
  );
  const buttonMatch = loginPageHtml.match(
    /name=["']([\w$]+Login\w*Button[\w$]*)["'][^>]*value=["']([^"']*)["']/i
  );

  if (userInputMatch) userField = userInputMatch[1];
  if (passInputMatch) passField = passInputMatch[1];
  if (buttonMatch) {
    buttonField = buttonMatch[1];
    buttonValue = buttonMatch[2];
  }

  console.log(
    `GoHub Auth: Fields: user=${userField}, pass=${passField}, btn=${buttonField}`
  );

  // Extract form action URL
  const actionMatch = loginPageHtml.match(
    /<form[^>]*action=["']([^"']*?)["'][^>]*>/i
  );
  const formAction = actionMatch
    ? new URL(
        actionMatch[1].replace(/&amp;/g, "&"),
        loginPageUrl
      ).toString()
    : loginPageUrl;

  // Step 4: Submit the login form
  const formData: Record<string, string> = {
    ...hiddenFields,
    [userField]: username,
    [passField]: password,
    [buttonField]: buttonValue,
  };

  console.log(`GoHub Auth: Submitting to ${formAction.substring(0, 100)}`);

  const loginResponse = await fetch(formAction, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: formatCookies(cookies),
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: loginPageUrl,
      Origin: new URL(loginPageUrl).origin,
    },
    body: new URLSearchParams(formData).toString(),
  });

  cookies = parseCookiesFromResponse(loginResponse, cookies);
  const postLocation = loginResponse.headers.get("location");

  if (!postLocation) {
    // No redirect after login → likely failed
    const responseHtml = await loginResponse.text();

    // Check for error message in ASP.NET page
    const errorMsgMatch = responseHtml.match(
      /class=["']ErrorMessage["'][^>]*>\s*([^<]+)/i
    );
    if (errorMsgMatch && errorMsgMatch[1].trim()) {
      throw new Error(
        `Login failed: ${errorMsgMatch[1].trim()}`
      );
    }

    // Check if we're still on the login page
    if (
      responseHtml.includes("ApplicationLogin") ||
      responseHtml.includes("Login to")
    ) {
      throw new Error(
        "Login failed: Invalid username or password. Check your GoHub credentials."
      );
    }

    // Might have logged in without redirect (unlikely for ASP.NET)
    console.log(
      "GoHub Auth: No redirect after login, but no error detected either"
    );
  } else {
    await loginResponse.text();
  }

  // Step 5: Follow redirect chain back to GoHub
  if (postLocation) {
    url = new URL(postLocation, formAction).toString();
    for (let i = 0; i < 10; i++) {
      console.log(
        `GoHub Auth: Post-login redirect ${i + 1}: ${url.substring(0, 120)}`
      );
      const response = await fetch(url, {
        redirect: "manual",
        headers: {
          Cookie: formatCookies(cookies),
          Accept: "text/html",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      cookies = parseCookiesFromResponse(response, cookies);
      const location = response.headers.get("location");
      await response.text();
      if (!location) break;
      url = new URL(location, url).toString();
    }
  }

  console.log(
    `GoHub Auth: Login complete, ${Object.keys(cookies).length} cookies captured`
  );
  return cookies;
}

// ─── Data Fetching ───────────────────────────────────────────

function buildApiHeaders(
  auth: AuthResult,
  levelId: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  if (auth.type === "token") {
    headers.Authorization = `Bearer ${auth.token}`;
  } else {
    headers.Cookie = formatCookies(auth.cookies);
  }

  if (levelId) {
    headers["X-GoTechnology-Level"] = levelId;
  }

  return headers;
}

async function fetchAllPages(
  auth: AuthResult,
  baseUrl: string,
  resource: string,
  levelId: string | null
): Promise<GoHubRecord[]> {
  const allRecords: GoHubRecord[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${baseUrl}/${resource}?ps=${MAX_PAGE_SIZE}&p=${page}`;
    const headers = buildApiHeaders(auth, levelId);

    console.log(`GoHub API: Fetching ${url}`);
    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) throw new Error("Session expired or unauthorized");
      if (response.status === 403) throw new Error(`Access denied for ${resource}`);
      if (response.status === 404) throw new Error(`Resource '${resource}' not found at this endpoint`);
      throw new Error(`API error [${response.status}]: ${errorText.substring(0, 200)}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      const text = await response.text();
      if (text.includes("<html") || text.includes("<!DOCTYPE") || text.includes("Login")) {
        throw new Error("API returned HTML (login page) — session may not be authenticated for API access");
      }
      throw new Error(`Expected JSON, got ${contentType}: ${text.substring(0, 100)}`);
    }

    const responseData = await response.json();

    if (Array.isArray(responseData)) {
      allRecords.push(...responseData);
      break;
    } else if (responseData.Items && Array.isArray(responseData.Items)) {
      const pagedData = responseData as GoHubPagedResponse;
      allRecords.push(...(pagedData.Items || []));
      totalPages = pagedData.TotalPages || 1;
      console.log(`GoHub API: Page ${page}/${totalPages}, ${pagedData.Items?.length || 0} records`);
    } else {
      allRecords.push(responseData as GoHubRecord);
      break;
    }
    page++;
  } while (page <= totalPages);

  return allRecords;
}

async function findWorkingApiBase(
  auth: AuthResult,
  instanceUrl: string,
  levelId: string | null,
  resource: string
): Promise<{ baseUrl: string; data: GoHubRecord[] }> {
  // Derive API bases from the instance URL
  const parsed = new URL(instanceUrl);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const instanceName = pathParts[0] || "BGC"; // e.g. "BGC"

  const apiBases = [
    `${parsed.origin}/${instanceName}/api`,
    `${parsed.origin}/api`,
  ];

  const errors: string[] = [];
  for (const baseUrl of apiBases) {
    try {
      console.log(`GoHub API: Trying ${baseUrl}/${resource}...`);
      const data = await fetchAllPages(auth, baseUrl, resource, levelId);
      console.log(`GoHub API: Success! ${data.length} records from ${baseUrl}`);
      return { baseUrl, data };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`GoHub API: ${baseUrl} failed: ${msg}`);
      errors.push(`${baseUrl}: ${msg}`);
    }
  }

  throw new Error(`Could not fetch ${resource}:\n${errors.join("\n")}`);
}

// ─── Data Transformation ─────────────────────────────────────

function transformToSystems(records: GoHubRecord[], resource: string) {
  return records.map((item, index) => {
    const systemId = item.Name || `${resource}-${index + 1}`;
    const name = item.Description || item.Name || `${resource} ${index + 1}`;

    let description = "";
    if (resource === "SubSystem" && item.System) {
      const systemName = typeof item.System === "object" ? item.System.Name : item.System;
      description = systemName ? `System: ${systemName}` : "";
    } else {
      description = `Imported from GoHub (${resource})`;
    }

    let isHydrocarbon = false;
    if (item.Phase) {
      const phaseName = typeof item.Phase === "object" ? item.Phase.Name : String(item.Phase);
      if (phaseName && /rfsu|hydrocarbon|hc|gas|oil/i.test(phaseName)) {
        isHydrocarbon = true;
      }
    }

    return {
      id: `gohub-${Date.now()}-${index}`,
      system_id: systemId,
      name,
      description,
      is_hydrocarbon: isHydrocarbon,
      source: "gohub",
      gohub_id: item.ID || null,
    };
  });
}

// ─── Main Handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Supabase user
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

    // Parse request body — credentials come from the frontend
    const body = await req.json();
    const {
      resource = "SubSystem",
      portalUrl,
      username,
      password,
      levelId: bodyLevelId,
    } = body;

    // Use request body credentials, fall back to secrets
    const finalPortalUrl =
      portalUrl ||
      Deno.env.get("GOHUB_PORTAL_URL") ||
      "https://goc.gotechnology.online/BGC/GoHub/Home.aspx";
    const finalUsername = username || Deno.env.get("GOHUB_USERNAME");
    const finalPassword = password || Deno.env.get("GOHUB_PASSWORD");
    const finalLevelId = bodyLevelId || Deno.env.get("GOHUB_LEVEL_ID") || null;

    if (!finalUsername || !finalPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "GoHub credentials required",
          setup_required: true,
          message:
            "Please enter your GoHub username and password in the import dialog.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate resource
    const validResources = [
      "System", "SubSystem", "Discipline", "Area",
      "CertificationGrouping", "Phase", "Priority",
    ];
    if (!validResources.includes(resource)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid resource: ${resource}. Valid: ${validResources.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`GoHub import: ${resource} from ${finalPortalUrl}`);

    // Step 1: Log in via the web interface
    const sessionCookies = await authWebLogin(
      finalPortalUrl,
      finalUsername,
      finalPassword
    );
    const auth: AuthResult = { type: "cookies", cookies: sessionCookies };
    console.log("GoHub import: Login successful");

    // Step 2: Fetch data from API using session cookies
    const { baseUrl, data: records } = await findWorkingApiBase(
      auth,
      finalPortalUrl,
      finalLevelId,
      resource
    );

    // Step 3: Transform
    const systems = transformToSystems(records, resource);

    console.log(`GoHub import: ${systems.length} records imported from ${resource}`);

    return new Response(
      JSON.stringify({
        success: true,
        systems,
        total: systems.length,
        resource,
        api_base: baseUrl,
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
