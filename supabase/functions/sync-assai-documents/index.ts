import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Extract Set-Cookie pairs from a response.
 */
function extractCookies(resp: Response): string[] {
  const headersAny = resp.headers as unknown as { getSetCookie?: () => string[] };
  const setCookies = headersAny.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    return setCookies.map((c) => c.split(";")[0].trim()).filter(Boolean);
  }
  const raw = resp.headers.get("set-cookie");
  if (!raw) return [];
  return raw.split(/,(?=[^;]+=[^;]+)/g).map((c) => c.split(";")[0].trim()).filter(Boolean);
}

/**
 * Merge cookies, keeping latest value per name.
 */
function mergeCookies(existing: string[], newOnes: string[]): string[] {
  const map = new Map<string, string>();
  for (const c of [...existing, ...newOnes]) {
    const [name, ...rest] = c.split("=");
    if (name && rest.length > 0) map.set(name.trim(), c);
  }
  return Array.from(map.values());
}

/**
 * Obtain a Bearer token via the Assai OAuth implicit-grant flow.
 *
 * The flow (as observed in the browser):
 *   1. GET /AAeu578/oauth/authorize?client_id=eu578&redirect_uri=...&response_type=token
 *   2. → 302 to /AAeu578/login.jsp?loginMethod=unpw&orig_request=...
 *   3. POST credentials to login.jsp
 *   4. → 302 back to /oauth/authorize → 302 to redirect_uri#access_token=...
 */
async function getAssaiBearerToken(
  baseUrl: string,
  dbName: string,
  username: string,
  password: string,
): Promise<{ token: string | null; error?: string }> {
  const redirectUri = `${baseUrl}/AAeu578/access_token.jsp?client_id=${dbName}`;
  const authorizeUrl = `${baseUrl}/AAeu578/oauth/authorize?client_id=${dbName}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token`;

  console.log(`[sync-assai] OAuth Step 1: ${authorizeUrl}`);

  let cookies: string[] = [];

  // Step 1: Hit authorize — expect redirect to login.jsp
  const authResp = await fetch(authorizeUrl, {
    method: "GET",
    headers: { "Accept": "text/html" },
    redirect: "manual",
  });
  cookies = mergeCookies(cookies, extractCookies(authResp));
  await authResp.text();

  let location = authResp.headers.get("location");
  console.log(`[sync-assai] OAuth authorize status=${authResp.status}, location=${location?.substring(0, 250)}`);

  if (!location) {
    return { token: null, error: "OAuth authorize did not redirect" };
  }

  // Resolve relative/http URLs
  let loginUrl = location.startsWith("http") ? location : new URL(location, authorizeUrl).toString();

  // Follow any intermediate redirects (e.g., http→https 301)
  for (let i = 0; i < 5; i++) {
    // Check if this is already a login page URL
    if (loginUrl.includes("login.jsp") || loginUrl.includes("login.aweb")) break;

    const intermediateResp = await fetch(loginUrl, {
      method: "GET",
      headers: { "Cookie": cookies.join("; "), "Accept": "text/html" },
      redirect: "manual",
    });
    cookies = mergeCookies(cookies, extractCookies(intermediateResp));
    await intermediateResp.text();

    const nextLoc = intermediateResp.headers.get("location");
    if (!nextLoc || intermediateResp.status < 300 || intermediateResp.status >= 400) break;
    loginUrl = nextLoc.startsWith("http") ? nextLoc : new URL(nextLoc, loginUrl).toString();
  }

  // CRITICAL: Force HTTPS to prevent http→https 301 which converts POST to GET
  loginUrl = loginUrl.replace(/^http:\/\//i, "https://");
  console.log(`[sync-assai] OAuth Step 2: Login page URL = ${loginUrl.substring(0, 250)}`);

  // Build the login URL with orig_request parameter so login.jsp redirects back to OAuth after auth
  const loginUrlWithOrig = loginUrl.includes("orig_request")
    ? loginUrl
    : `${loginUrl}${loginUrl.includes("?") ? "&" : "?"}loginMethod=unpw&orig_request=${encodeURIComponent(authorizeUrl)}`;

  console.log(`[sync-assai] Login URL with orig_request: ${loginUrlWithOrig.substring(0, 300)}`);

  // Step 2: GET the login page to capture hidden fields (cr, etc.) and cookies
  const loginPageResp = await fetch(loginUrlWithOrig, {
    method: "GET",
    headers: { "Cookie": cookies.join("; "), "Accept": "text/html" },
    redirect: "follow",  // Follow any remaining redirects
  });
  cookies = mergeCookies(cookies, extractCookies(loginPageResp));
  const loginPageBody = await loginPageResp.text();
  const loginFinalUrl = loginPageResp.url || loginUrlWithOrig;

  console.log(`[sync-assai] Login page final_url=${loginFinalUrl.substring(0, 200)}, status=${loginPageResp.status}, body_length=${loginPageBody.length}`);

  // Check if we already got a token (unlikely but possible)
  const tokenInLoginUrl = loginFinalUrl.match(/[#&]access_token=([^&\s]+)/);
  if (tokenInLoginUrl) return { token: tokenInLoginUrl[1] };

  // Extract hidden fields from the login form
  const extractHidden = (name: string): string => {
    const match = loginPageBody.match(new RegExp(`name=["']${name}["'][^>]*value=["']([^"']*)["']`, "i"));
    if (match) return match[1];
    const match2 = loginPageBody.match(new RegExp(`value=["']([^"']*)["'][^>]*name=["']${name}["']`, "i"));
    return match2?.[1] ?? "";
  };

  const crValue = extractHidden("cr");
  const origRequestFromForm = extractHidden("orig_request");
  const formAction = loginPageBody.match(/action=["']([^"']+)["']/i)?.[1] || "";

  console.log(`[sync-assai] Hidden fields: cr=${crValue ? "present" : "empty"}, orig_request=${origRequestFromForm ? "present" : "empty"}, form_action=${formAction}`);

  // Step 3: POST credentials to login.jsp (ALWAYS use HTTPS)
  const loginPostUrl = (formAction
    ? new URL(formAction, loginFinalUrl).toString()
    : loginFinalUrl.split("?")[0]
  ).replace(/^http:\/\//i, "https://");

  const formData = new URLSearchParams({
    userid: username,
    password: password,
    ...(crValue ? { cr: crValue } : {}),
    orig_request: origRequestFromForm || authorizeUrl,
  });

  console.log(`[sync-assai] OAuth Step 3: POSTing credentials to ${loginPostUrl}`);

  const loginResp = await fetch(loginPostUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookies.join("; "),
      "Accept": "text/html",
    },
    body: formData.toString(),
    redirect: "manual",
  });
  cookies = mergeCookies(cookies, extractCookies(loginResp));
  await loginResp.text();

  let postLocation = loginResp.headers.get("location");
  console.log(`[sync-assai] Login POST status=${loginResp.status}, location=${postLocation?.substring(0, 250)}`);

  if (!postLocation && loginResp.status === 200) {
    return { token: null, error: "Login POST returned 200 — credentials may be wrong or form structure changed" };
  }

  // Step 4: Follow the redirect chain after login to capture the token
  let currentUrl = postLocation!;
  if (!currentUrl.startsWith("http")) {
    currentUrl = new URL(currentUrl, loginPostUrl).toString();
  }

  for (let hop = 0; hop < 10; hop++) {
    // Check current URL for token fragment
    const tokenInUrl = currentUrl.match(/[#&]access_token=([^&\s]+)/);
    if (tokenInUrl) {
      console.log(`[sync-assai] Token found in URL at hop ${hop}`);
      return { token: tokenInUrl[1] };
    }

    const resp = await fetch(currentUrl, {
      method: "GET",
      headers: {
        "Cookie": cookies.join("; "),
        "Accept": "text/html",
      },
      redirect: "manual",
    });
    cookies = mergeCookies(cookies, extractCookies(resp));

    const loc = resp.headers.get("location");
    console.log(`[sync-assai] Redirect hop ${hop}: status=${resp.status}, location=${loc?.substring(0, 250) ?? "none"}`);

    // Check Location header for token
    if (loc) {
      const tokenMatch = loc.match(/[#&]access_token=([^&\s]+)/);
      if (tokenMatch) {
        await resp.text();
        console.log(`[sync-assai] Token found in Location header at hop ${hop}`);
        return { token: tokenMatch[1] };
      }
    }

    if (resp.status >= 300 && resp.status < 400 && loc) {
      await resp.text();
      currentUrl = loc.startsWith("http") ? loc : new URL(loc, currentUrl).toString();
      continue;
    }

    // Landed on a final page — check body
    const body = await resp.text();
    console.log(`[sync-assai] Final page: ${currentUrl.substring(0, 200)}`);
    console.log(`[sync-assai] Final body preview: ${body.substring(0, 300)}`);

    // Look for token in body
    const bodyMatch = body.match(/access_token[=:]["'\s]*([A-Za-z0-9\-._~+/]+=*)/);
    if (bodyMatch) return { token: bodyMatch[1] };

    const inputMatch = body.match(/value=["'](Bearer [^"']+|[A-Za-z0-9\-._~+/]{20,})['"]/);
    if (inputMatch) {
      const val = inputMatch[1].replace(/^Bearer\s+/, "");
      return { token: val };
    }

    break;
  }

  return { token: null, error: "Could not extract token after following all redirects" };
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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    const { data: creds, error: credsError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("dms_platform", "assai")
      .limit(1)
      .maybeSingle();

    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ success: false, error: "No Assai credentials configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl = (creds.base_url || "").replace(/\/+$/, "");
    const username = creds.username_encrypted || "";
    const password = String(creds.password_encrypted ?? "");
    const dbName = creds.db_name || "";

    // Normalize base URL (strip AW path if present)
    const normalizedBase = baseUrl.replace(/\/AW[^/]+\/login\.aweb.*$/i, "").replace(/\/+$/, "");
    let resolvedBase: string;
    try {
      const u = new URL(normalizedBase);
      resolvedBase = `${u.origin}`;
    } catch {
      resolvedBase = normalizedBase;
    }
    const resolvedDb = dbName || (() => {
      const m = baseUrl.match(/\/AW([^/]+?)(?:\/|$)/i);
      return m?.[1]?.toLowerCase() ?? "";
    })();

    // Create sync log
    const { data: syncLog } = await supabase
      .from("dms_sync_logs")
      .insert({
        dms_platform: "assai",
        credential_id: creds.id,
        sync_status: "in_progress",
        triggered_by: user?.id || null,
        tenant_id: creds.tenant_id,
      })
      .select("id")
      .single();
    const syncLogId = syncLog?.id;

    try {
      // Step 1: Get Bearer token via OAuth flow (logs into AA login.jsp internally)
      console.log(`[sync-assai] Starting OAuth token acquisition. base=${resolvedBase}, db=${resolvedDb}`);
      const tokenResult = await getAssaiBearerToken(resolvedBase, resolvedDb, username, password);

      if (!tokenResult.token) {
        throw new Error(`Failed to acquire Bearer token: ${tokenResult.error}`);
      }

      const bearerToken = tokenResult.token;
      console.log(`[sync-assai] Bearer token acquired: length=${bearerToken.length}`);

      // Step 2: Fetch documents with Bearer token
      const docsUrl = `${resolvedBase}/AA${resolvedDb}/api/v1/documents`;
      console.log(`[sync-assai] Fetching documents: ${docsUrl}`);

      const docsResp = await fetch(docsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${bearerToken}`,
          "Accept": "application/json",
        },
      });

      const respText = await docsResp.text();
      console.log(`[sync-assai] Docs status=${docsResp.status}, preview=${respText.substring(0, 500)}`);

      if (!docsResp.ok) {
        throw new Error(`Documents API ${docsResp.status}: ${respText.substring(0, 300)}`);
      }

      const docsJson = JSON.parse(respText);
      const documents: any[] = Array.isArray(docsJson)
        ? docsJson
        : docsJson.data || docsJson.documents || docsJson.results || docsJson.items || [];

      console.log(`[sync-assai] Total documents fetched: ${documents.length}`);

      // Step 3: Upsert to dms_external_sync
      let syncedCount = 0, failedCount = 0, newCount = 0, statusChanges = 0;

      for (const doc of documents) {
        try {
          const docNumber = doc.document_number || doc.documentNumber || doc.number || doc.doc_no || "";
          if (!docNumber) continue;

          const docTitle = doc.title || doc.document_title || doc.documentTitle || doc.description || "";
          const revision = doc.revision || doc.rev || doc.current_revision || "";
          const statusCode = doc.status || doc.status_code || doc.documentStatus || "";
          const disciplineCode = doc.discipline || doc.discipline_code || doc.disciplineCode || "";
          const packageCode = doc.work_package || doc.workPackage || doc.package_code || "";

          const { data: existing } = await supabase
            .from("dms_external_sync")
            .select("id, status_code")
            .eq("dms_platform", "assai")
            .eq("document_number", docNumber)
            .limit(1)
            .maybeSingle();

          if (existing) {
            if (existing.status_code !== statusCode) statusChanges++;
            await supabase.from("dms_external_sync").update({
              document_title: docTitle,
              revision,
              status_code: statusCode,
              discipline_code: disciplineCode,
              package_tag: packageCode,
              last_synced_at: new Date().toISOString(),
              sync_status: "synced",
              metadata: { raw: doc, last_sync_source: "rest_api" },
            }).eq("id", existing.id);
          } else {
            await supabase.from("dms_external_sync").insert({
              dms_platform: "assai",
              document_number: docNumber,
              document_title: docTitle,
              revision,
              status_code: statusCode,
              discipline_code: disciplineCode,
              package_tag: packageCode,
              last_synced_at: new Date().toISOString(),
              sync_status: "synced",
              tenant_id: creds.tenant_id,
              metadata: { raw: doc, last_sync_source: "rest_api" },
            });
            newCount++;
          }
          syncedCount++;
        } catch (e) {
          console.error(`[sync-assai] Failed to sync doc:`, e);
          failedCount++;
        }
      }

      if (syncLogId) {
        await supabase.from("dms_sync_logs").update({
          sync_status: "completed",
          synced_count: syncedCount,
          failed_count: failedCount,
          new_documents: newCount,
          status_changes: statusChanges,
        }).eq("id", syncLogId);
      }

      await supabase.from("dms_sync_credentials").update({
        last_sync_at: new Date().toISOString(),
      }).eq("id", creds.id);

      return new Response(
        JSON.stringify({
          success: true,
          synced_count: syncedCount,
          new_documents: newCount,
          status_changes: statusChanges,
          failed_count: failedCount,
          message: documents.length === 0
            ? "Authenticated successfully but no documents returned. Check API permissions."
            : `Synced ${syncedCount} documents (${newCount} new, ${statusChanges} status changes)`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );

    } catch (syncErr: any) {
      console.error("[sync-assai] Sync error:", syncErr);
      if (syncLogId) {
        await supabase.from("dms_sync_logs").update({
          sync_status: "failed",
          error_message: syncErr.message,
          error_details: { stack: syncErr.stack },
        }).eq("id", syncLogId);
      }
      return new Response(
        JSON.stringify({ success: false, error: syncErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
