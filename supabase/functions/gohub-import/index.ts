import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// GoHub OAuth2 Token Endpoint (GoTechnology Identity Provider)
const GOHUB_TOKEN_URL = "https://id.qedi.co.uk/connect/token";

// BGC instance URLs
const GOHUB_INSTANCE = "https://goc.gotechnology.online/BGC";
const GOHUB_API_BASES = [
  `${GOHUB_INSTANCE}/api`,
  "https://goc.gotechnology.online/api",
];

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
    // Modern Deno: getSetCookie returns all Set-Cookie headers
    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];

    if (setCookies.length > 0) {
      for (const header of setCookies) {
        parseSingleSetCookie(header, cookies);
      }
      return cookies;
    }
  } catch (_) {
    // Fall through
  }

  // Fallback: get combined header (may lose multiple Set-Cookie values)
  const combined = response.headers.get("set-cookie");
  if (combined) {
    parseSingleSetCookie(combined, cookies);
  }

  return cookies;
}

function parseSingleSetCookie(
  header: string,
  cookies: Record<string, string>
) {
  const [nameValue] = header.split(";");
  const eqIndex = nameValue.indexOf("=");
  if (eqIndex > 0) {
    const name = nameValue.substring(0, eqIndex).trim();
    const value = nameValue.substring(eqIndex + 1).trim();
    if (value) cookies[name] = value;
  }
}

function formatCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

// ─── HTML Parsing Utilities ──────────────────────────────────

function extractFormAction(html: string, pageUrl: string): string {
  const match =
    html.match(
      /<form[^>]*method=["']post["'][^>]*action=["']([^"']*?)["'][^>]*>/i
    ) ||
    html.match(
      /<form[^>]*action=["']([^"']*?)["'][^>]*method=["']post["'][^>]*>/i
    ) ||
    html.match(/<form[^>]*action=["']([^"']*?)["'][^>]*>/i);

  if (!match || !match[1]) return pageUrl;
  const action = match[1].replace(/&amp;/g, "&");
  return new URL(action, pageUrl).toString();
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
        ? valueMatch[1].replace(/&amp;/g, "&")
        : "";
    }
  }
  return fields;
}

function findFieldName(html: string, candidates: string[]): string {
  for (const name of candidates) {
    if (html.includes(`name="${name}"`) || html.includes(`name='${name}'`)) {
      return name;
    }
  }
  return candidates[0];
}

// ─── Auth: Client Credentials Flow ──────────────────────────

async function authClientCredentials(
  clientId: string,
  clientSecret: string
): Promise<string> {
  console.log("GoHub Auth: Trying Client Credentials flow...");

  const formBody = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "hub2_api",
    client_id: clientId,
    client_secret: clientSecret,
  });

  let response = await fetch(GOHUB_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody.toString(),
  });

  if (!response.ok) {
    const err1 = await response.text();
    console.warn("GoHub Auth: Form-body client credentials failed:", err1);

    const credentials = btoa(`${clientId}:${clientSecret}`);
    response = await fetch(GOHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials&scope=hub2_api",
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Client credentials failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  if (!data.access_token) throw new Error("No access token in response");

  console.log(
    `GoHub Auth: Client credentials succeeded, expires in ${data.expires_in}s`
  );
  return data.access_token;
}

// ─── Auth: ROPC (Resource Owner Password Credentials) ───────

async function discoverWebClientId(): Promise<string | null> {
  console.log("GoHub Auth: Discovering web app client_id...");

  let url = `${GOHUB_INSTANCE}/GoHub/Home.aspx`;

  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      const location = response.headers.get("location");
      await response.text();

      if (!location) break;

      const nextUrl = new URL(location, url);

      if (
        nextUrl.hostname.includes("id.qedi.co.uk") ||
        nextUrl.pathname.includes("/connect/authorize")
      ) {
        const clientId = nextUrl.searchParams.get("client_id");
        if (clientId) {
          console.log(`GoHub Auth: Discovered client_id: ${clientId}`);
          return clientId;
        }
      }

      url = nextUrl.toString();
    } catch (e) {
      console.warn(`GoHub Auth: Redirect discovery error at step ${i}:`, e);
      break;
    }
  }

  return null;
}

async function tryROPC(
  username: string,
  password: string,
  clientId: string
): Promise<string> {
  console.log(`GoHub Auth: Trying ROPC with client_id=${clientId}...`);

  const formBody = new URLSearchParams({
    grant_type: "password",
    username,
    password,
    scope: "openid hub2_api offline_access",
    client_id: clientId,
  });

  const response = await fetch(GOHUB_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ROPC failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error("No access token in ROPC response");

  console.log(`GoHub Auth: ROPC succeeded, expires in ${data.expires_in}s`);
  return data.access_token;
}

// ─── Auth: Web Login Simulation ─────────────────────────────

async function authWebLogin(
  username: string,
  password: string
): Promise<Record<string, string>> {
  console.log("GoHub Auth: Starting web login simulation...");
  let cookies: Record<string, string> = {};

  // Step 1: Navigate to GoHub → follow redirects to IdP login page
  let url = `${GOHUB_INSTANCE}/GoHub/Home.aspx`;
  let loginPageHtml = "";
  let loginPageUrl = "";

  for (let i = 0; i < 15; i++) {
    console.log(
      `GoHub Auth: Redirect ${i + 1}: ${url.substring(0, 120)}...`
    );

    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        Cookie: formatCookies(cookies),
        Accept: "text/html,application/xhtml+xml",
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
    throw new Error("Could not reach the GoHub login page after redirects");
  }

  console.log(
    `GoHub Auth: Login page reached at: ${loginPageUrl.substring(0, 80)}...`
  );
  console.log(
    `GoHub Auth: Page size: ${loginPageHtml.length} chars, cookies: ${Object.keys(cookies).length}`
  );

  // Step 2: Parse the login form
  const formAction = extractFormAction(loginPageHtml, loginPageUrl);
  const hiddenFields = extractHiddenFields(loginPageHtml);

  const usernameField = findFieldName(loginPageHtml, [
    "Input.Username",
    "Username",
    "Email",
    "Input.Email",
    "username",
    "email",
    "login",
  ]);
  const passwordField = findFieldName(loginPageHtml, [
    "Input.Password",
    "Password",
    "Input.password",
    "password",
  ]);

  console.log(
    `GoHub Auth: Form action: ${formAction.substring(0, 100)}`
  );
  console.log(
    `GoHub Auth: Fields: username=${usernameField}, password=${passwordField}, hidden=${Object.keys(hiddenFields).join(",")}`
  );

  // Step 3: Submit the login form
  const formData: Record<string, string> = {
    ...hiddenFields,
    [usernameField]: username,
    [passwordField]: password,
  };

  // Add button/remember fields if present
  const buttonField = findFieldName(loginPageHtml, [
    "Input.Button",
    "button",
    "Button",
  ]);
  if (
    loginPageHtml.includes(`name="${buttonField}"`) &&
    buttonField !== "Input.Button"
  ) {
    formData[buttonField] = "login";
  }

  const rememberField = findFieldName(loginPageHtml, [
    "Input.RememberLogin",
    "RememberLogin",
    "RememberMe",
  ]);
  if (loginPageHtml.includes(`name="${rememberField}"`)) {
    formData[rememberField] = "false";
  }

  console.log("GoHub Auth: Submitting login form...");

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
    const responseHtml = await loginResponse.text();

    // Check for error indicators
    if (
      responseHtml.includes("Invalid") ||
      responseHtml.includes("invalid") ||
      responseHtml.includes("incorrect") ||
      responseHtml.includes("error")
    ) {
      // Try to extract specific error message
      const errorMatch = responseHtml.match(
        /class=["'][^"']*error[^"']*["'][^>]*>([^<]+)</i
      );
      const errorMsg = errorMatch
        ? errorMatch[1].trim()
        : "Invalid username or password";
      throw new Error(`GoHub login failed: ${errorMsg}`);
    }

    throw new Error(
      `GoHub login: No redirect after form submission (status ${loginResponse.status})`
    );
  }

  await loginResponse.text();

  // Step 4: Follow redirect chain back to GoHub
  url = new URL(postLocation, formAction).toString();

  for (let i = 0; i < 15; i++) {
    console.log(
      `GoHub Auth: Post-login redirect ${i + 1}: ${url.substring(0, 120)}...`
    );

    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        Cookie: formatCookies(cookies),
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    cookies = parseCookiesFromResponse(response, cookies);
    const location = response.headers.get("location");
    await response.text();

    if (!location) {
      console.log("GoHub Auth: Web login completed (no more redirects)");
      break;
    }

    url = new URL(location, url).toString();
  }

  console.log(
    `GoHub Auth: Web login successful, captured ${Object.keys(cookies).length} cookies`
  );
  return cookies;
}

// ─── Main Authentication ─────────────────────────────────────

async function authenticate(): Promise<AuthResult> {
  const username = Deno.env.get("GOHUB_USERNAME");
  const password = Deno.env.get("GOHUB_PASSWORD");
  const clientId = Deno.env.get("GOHUB_CLIENT_ID");
  const clientSecret = Deno.env.get("GOHUB_CLIENT_SECRET");

  const errors: string[] = [];

  // Method 1: User credentials (try ROPC first, then web login)
  if (username && password) {
    // Try ROPC with discovered client_id
    try {
      const webClientId = await discoverWebClientId();
      if (webClientId) {
        const token = await tryROPC(username, password, webClientId);
        return { type: "token", token };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("GoHub Auth: ROPC with discovered client_id failed:", msg);
      errors.push(`ROPC (discovered): ${msg}`);
    }

    // Try ROPC with common client_ids
    for (const tryId of ["hub2", "bgc_hub2", "gohub", "BGC", "hub2_web"]) {
      try {
        const token = await tryROPC(username, password, tryId);
        return { type: "token", token };
      } catch (_) {
        // Continue
      }
    }

    // Fall back to web login simulation
    try {
      console.log(
        "GoHub Auth: ROPC not available, falling back to web login simulation..."
      );
      const sessionCookies = await authWebLogin(username, password);
      return { type: "cookies", cookies: sessionCookies };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("GoHub Auth: Web login failed:", msg);
      errors.push(`Web login: ${msg}`);
    }
  }

  // Method 2: Client credentials (Machine App)
  if (clientId && clientSecret) {
    try {
      const token = await authClientCredentials(clientId, clientSecret);
      return { type: "token", token };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("GoHub Auth: Client credentials failed:", msg);
      errors.push(`Client credentials: ${msg}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `All GoHub authentication methods failed:\n${errors.join("\n")}`
    );
  }

  throw new Error(
    "No GoHub credentials configured. Set GOHUB_USERNAME + GOHUB_PASSWORD, " +
      "or GOHUB_CLIENT_ID + GOHUB_CLIENT_SECRET in project secrets."
  );
}

// ─── Data Fetching ───────────────────────────────────────────

function buildHeaders(
  auth: AuthResult,
  levelId: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
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
    const headers = buildHeaders(auth, levelId);

    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401)
        throw new Error("Authentication expired or invalid");
      if (response.status === 403)
        throw new Error(`Access denied for ${resource}`);
      if (response.status === 404)
        throw new Error(`Resource '${resource}' not found`);
      throw new Error(
        `API request failed [${response.status}]: ${errorText.substring(0, 200)}`
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      const text = await response.text();
      // If we got HTML back, the session might not be valid for API access
      if (text.includes("<html") || text.includes("<!DOCTYPE")) {
        throw new Error(
          "API returned HTML instead of JSON — the session may not have API access"
        );
      }
      throw new Error(
        `Expected JSON but got ${contentType}: ${text.substring(0, 100)}`
      );
    }

    const responseData = await response.json();

    if (Array.isArray(responseData)) {
      allRecords.push(...responseData);
      break;
    } else if (responseData.Items && Array.isArray(responseData.Items)) {
      const pagedData = responseData as GoHubPagedResponse;
      allRecords.push(...(pagedData.Items || []));
      totalPages = pagedData.TotalPages || 1;
      console.log(
        `GoHub API: Page ${page}/${totalPages}, got ${pagedData.Items?.length || 0} records`
      );
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
  levelId: string | null,
  resource: string
): Promise<{ baseUrl: string; data: GoHubRecord[] }> {
  const errors: string[] = [];

  for (const baseUrl of GOHUB_API_BASES) {
    try {
      console.log(`GoHub API: Trying ${baseUrl}/${resource}...`);
      const data = await fetchAllPages(auth, baseUrl, resource, levelId);
      console.log(
        `GoHub API: Success with ${baseUrl}, got ${data.length} records`
      );
      return { baseUrl, data };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`GoHub API: ${baseUrl} failed: ${msg}`);
      errors.push(`${baseUrl}: ${msg}`);
    }
  }

  throw new Error(
    `Could not fetch ${resource} from GoHub API:\n${errors.join("\n")}`
  );
}

// ─── Data Transformation ─────────────────────────────────────

function transformToSystems(records: GoHubRecord[], resource: string) {
  return records.map((item, index) => {
    const systemId = item.Name || `${resource}-${index + 1}`;
    const name = item.Description || item.Name || `${resource} ${index + 1}`;

    let description = "";
    if (resource === "SubSystem" && item.System) {
      const systemName =
        typeof item.System === "object" ? item.System.Name : item.System;
      description = systemName ? `System: ${systemName}` : "";
    } else {
      description = `Imported from GoHub (${resource})`;
    }

    let isHydrocarbon = false;
    if (item.Phase) {
      const phaseName =
        typeof item.Phase === "object" ? item.Phase.Name : String(item.Phase);
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
    // Validate Supabase user auth
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

    // Check if any GoHub credentials are configured
    const hasUserCreds =
      Deno.env.get("GOHUB_USERNAME") && Deno.env.get("GOHUB_PASSWORD");
    const hasClientCreds =
      Deno.env.get("GOHUB_CLIENT_ID") && Deno.env.get("GOHUB_CLIENT_SECRET");

    if (!hasUserCreds && !hasClientCreds) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "GoHub credentials not configured",
          setup_required: true,
          message:
            "No GoHub credentials found. Configure one of:\n\n" +
            "Option A — User Login (recommended):\n" +
            "  1. Add GOHUB_USERNAME (your GoHub email)\n" +
            "  2. Add GOHUB_PASSWORD (your GoHub password)\n\n" +
            "Option B — API Credentials:\n" +
            "  1. Register a Machine App with GoTechnology Support\n" +
            "  2. Add GOHUB_CLIENT_ID and GOHUB_CLIENT_SECRET\n\n" +
            "Also add GOHUB_LEVEL_ID (find at Admin → Level E in GoHub)",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { resource = "SubSystem" } = body;

    const validResources = [
      "System",
      "SubSystem",
      "Discipline",
      "Area",
      "CertificationGrouping",
      "Phase",
      "Priority",
    ];

    if (!validResources.includes(resource)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid resource '${resource}'. Valid: ${validResources.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`GoHub import: Starting import for ${resource}...`);

    // Authenticate with GoHub
    const auth = await authenticate();
    console.log(`GoHub import: Authenticated via ${auth.type}`);

    // Get level ID (required for token-based auth)
    const levelId = Deno.env.get("GOHUB_LEVEL_ID") || null;
    if (!levelId && auth.type === "token") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "GOHUB_LEVEL_ID not configured",
          setup_required: true,
          message:
            "GOHUB_LEVEL_ID is required for API access. To find it:\n" +
            "1. Log in to GoHub web application\n" +
            "2. Navigate to Admin → Level E\n" +
            "3. Click your facility/scope\n" +
            "4. Copy the GUID from the page URL",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch data from GoHub
    const { baseUrl, data: records } = await findWorkingApiBase(
      auth,
      levelId,
      resource
    );

    // Transform to our system format
    const systems = transformToSystems(records, resource);

    console.log(
      `GoHub import: Successfully imported ${systems.length} records from ${resource} via ${baseUrl} (auth: ${auth.type})`
    );

    return new Response(
      JSON.stringify({
        success: true,
        systems,
        total: systems.length,
        resource,
        api_base: baseUrl,
        auth_method: auth.type,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("GoHub import error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
