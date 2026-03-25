import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
      fields[nameMatch[1]] = valueMatch ? decodeHtmlEntities(valueMatch[1]) : "";
    }
  }
  return fields;
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: creds, error: credsError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("dms_platform", "gocompletions")
      .limit(1)
      .single();

    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ success: false, error: "No GoCompletions credentials configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const portalUrl = creds.base_url || "";
    const username = creds.username_encrypted || "";
    const password = String(creds.password_encrypted ?? "");

    console.log(`[test-goc] portal_url=${portalUrl}, username=${username}, password_length=${password.length}`);

    if (!portalUrl || !username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Incomplete credentials: portal URL, username, and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const start = Date.now();

    // Step 1: Load login page
    const { html: loginPageHtml, url: loginPageUrl, cookies: loginCookies } =
      await followRedirects(portalUrl, {});
    let cookies = loginCookies;

    if (!loginPageHtml) {
      const elapsed = Date.now() - start;
      return new Response(
        JSON.stringify({ success: false, error: "Could not reach the GoHub login page", response_time_ms: elapsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 2: Extract form fields and submit login
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
    const elapsed = Date.now() - start;

    const postLocation = loginResponse.headers.get("location");

    if (!postLocation) {
      const responseHtml = await loginResponse.text();
      const errorMsgMatch = responseHtml.match(/class=["']ErrorMessage["'][^>]*>\s*([^<]+)/i);
      if (errorMsgMatch && errorMsgMatch[1].trim()) {
        return new Response(
          JSON.stringify({ success: false, error: `Login failed: ${errorMsgMatch[1].trim()}`, response_time_ms: elapsed }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (responseHtml.includes("ApplicationLogin") || responseHtml.includes("Login to")) {
        return new Response(
          JSON.stringify({ success: false, error: "Incorrect username or password", response_time_ms: elapsed }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      // No redirect but also no login form = likely success (direct landing)
      return new Response(
        JSON.stringify({ success: true, response_time_ms: elapsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Follow redirect to home page — success
    await loginResponse.text();
    console.log(`[test-goc] Login successful, redirected to: ${postLocation.substring(0, 100)}, elapsed=${elapsed}ms`);

    return new Response(
      JSON.stringify({ success: true, response_time_ms: elapsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[test-goc] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Connection failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});