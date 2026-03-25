import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Obtain a Bearer token via the Assai OAuth implicit-grant flow.
 * The flow is:
 *   GET /AAeu578/oauth/authorize?client_id=eu578&redirect_uri=...&response_type=token
 *   → 307 → 302 (Location header contains #access_token=...)
 * We must follow manually because URL fragments are dropped by fetch().
 */
async function getAssaiBearerToken(
  baseUrl: string,
  dbName: string,
  sessionCookies: string[],
): Promise<string | null> {
  const cookieHeader = sessionCookies.join("; ");
  const redirectUri = `${baseUrl}/AAeu578/access_token.jsp?client_id=${dbName}`;
  const authorizeUrl = `${baseUrl}/AAeu578/oauth/authorize?client_id=${dbName}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token`;

  console.log(`[sync-assai] Starting OAuth authorize flow: ${authorizeUrl}`);

  // Follow redirects manually to capture the fragment in Location headers
  let currentUrl = authorizeUrl;
  let cookies = [...sessionCookies];

  for (let hop = 0; hop < 10; hop++) {
    const resp = await fetch(currentUrl, {
      method: "GET",
      headers: {
        "Cookie": cookies.join("; "),
        "Accept": "text/html,application/json",
      },
      redirect: "manual",
    });

    // Collect any new cookies
    const headersAny = resp.headers as unknown as { getSetCookie?: () => string[] };
    const newCookies = headersAny.getSetCookie?.() ?? [];
    for (const c of newCookies) {
      const pair = c.split(";")[0].trim();
      if (pair) cookies.push(pair);
    }

    const location = resp.headers.get("location");
    const status = resp.status;
    console.log(`[sync-assai] OAuth hop ${hop}: status=${status}, location=${location?.substring(0, 200) ?? "none"}`);

    // Check if the Location header contains the access_token fragment
    if (location) {
      const tokenMatch = location.match(/[#&]access_token=([^&\s]+)/);
      if (tokenMatch) {
        console.log(`[sync-assai] Found token in redirect Location (hop ${hop})`);
        return tokenMatch[1];
      }
    }

    if (status >= 300 && status < 400 && location) {
      // Resolve relative URLs
      currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString();
      // Consume the body to avoid resource leaks
      await resp.text();
      continue;
    }

    // If we landed on a 200 page, check the body and final URL for the token
    const body = await resp.text();
    const finalUrl = resp.url || currentUrl;
    console.log(`[sync-assai] OAuth landed: final_url=${finalUrl.substring(0, 200)}`);
    console.log(`[sync-assai] OAuth body preview=${body.substring(0, 500)}`);

    // Check final URL for fragment (unlikely with fetch, but try)
    const fragMatch = finalUrl.match(/[#&]access_token=([^&\s]+)/);
    if (fragMatch) return fragMatch[1];

    // Check body for token patterns
    const bodyMatch = body.match(/access_token[=:]["'\s]*([A-Za-z0-9\-._~+/]+=*)/);
    if (bodyMatch) return bodyMatch[1];

    // Check for input field with token value
    const inputMatch = body.match(/value=["']([A-Za-z0-9\-._~+/]{20,})['"]/);
    if (inputMatch) return inputMatch[1];

    break;
  }

  return null;
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

    // Read Assai credentials
    const { data: creds, error: credsError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("dms_platform", "assai")
      .limit(1)
      .single();

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
      // Step 1: Login to Assai using session cookies
      console.log("[sync-assai] Logging in to Assai...");
      const loginResult = await loginAssai(baseUrl, username, password, dbName);

      if (!loginResult.success || !loginResult.cookies) {
        throw new Error(loginResult.error || "Login failed");
      }

      const sessionCookies = loginResult.cookies;
      const resolvedBase = loginResult.baseUrl!;
      const resolvedDb = loginResult.dbName!;

      // Step 2: Get Bearer token via OAuth implicit grant flow
      console.log("[sync-assai] Attempting OAuth authorize flow for Bearer token...");
      let bearerToken = await getAssaiBearerToken(resolvedBase, resolvedDb, sessionCookies);

      // Fallback: try access_token.jsp directly (in case authorize flow didn't yield a token)
      if (!bearerToken) {
        console.log("[sync-assai] OAuth flow didn't yield token, trying access_token.jsp directly...");
        const tokenPageUrl = `${resolvedBase}/AA${resolvedDb}/access_token.jsp?client_id=${resolvedDb}`;
        const tokenPageResp = await fetch(tokenPageUrl, {
          method: "GET",
          headers: {
            "Cookie": sessionCookies.join("; "),
            "Accept": "text/html,application/json",
          },
          redirect: "follow",
        });
        const tokenPageText = await tokenPageResp.text();
        console.log(`[sync-assai] access_token.jsp status=${tokenPageResp.status}, body_preview=${tokenPageText.substring(0, 300)}`);

        const bodyMatch = tokenPageText.match(/access_token[=:]["'\s]*([A-Za-z0-9\-._~+/]+=*)/);
        if (bodyMatch) bearerToken = bodyMatch[1];

        const inputMatch = tokenPageText.match(/value=["']([A-Za-z0-9\-._~+/]{20,})['"]/);
        if (!bearerToken && inputMatch) bearerToken = inputMatch[1];
      }

      console.log(`[sync-assai] Bearer token acquired: ${bearerToken ? "YES (length=" + bearerToken.length + ")" : "NO"}`);

      // Step 3: Fetch documents — try Bearer token first, then session cookies as fallback
      const docsUrl = `${resolvedBase}/AA${resolvedDb}/api/v1/documents`;
      console.log(`[sync-assai] Fetching documents from: ${docsUrl}`);

      let docsResp: Response;
      let respText: string;

      if (bearerToken) {
        // Try with Bearer token
        docsResp = await fetch(docsUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${bearerToken}`,
            "Accept": "application/json",
          },
        });
        respText = await docsResp.text();
        console.log(`[sync-assai] Docs (Bearer) status=${docsResp.status}, preview=${respText.substring(0, 300)}`);

        // If Bearer failed, fall back to session cookies
        if (!docsResp.ok) {
          console.log("[sync-assai] Bearer token rejected, falling back to session cookies...");
          docsResp = await fetch(docsUrl, {
            method: "GET",
            headers: {
              "Cookie": sessionCookies.join("; "),
              "Accept": "application/json",
            },
          });
          respText = await docsResp.text();
          console.log(`[sync-assai] Docs (cookies) status=${docsResp.status}, preview=${respText.substring(0, 300)}`);
        }
      } else {
        // No Bearer token — try session cookies directly
        console.log("[sync-assai] No Bearer token, using session cookies for API call...");
        docsResp = await fetch(docsUrl, {
          method: "GET",
          headers: {
            "Cookie": sessionCookies.join("; "),
            "Accept": "application/json",
          },
        });
        respText = await docsResp.text();
        console.log(`[sync-assai] Docs (cookies) status=${docsResp.status}, preview=${respText.substring(0, 300)}`);
      }

      if (!docsResp.ok) {
        throw new Error(`Documents API ${docsResp.status}: ${respText.substring(0, 300)}`);
      }

      const docsJson = JSON.parse(respText);
      const documents: any[] = Array.isArray(docsJson)
        ? docsJson
        : docsJson.data || docsJson.documents || docsJson.results || docsJson.items || [];

      console.log(`[sync-assai] Total documents fetched: ${documents.length}`);

      // Step 4: Upsert to dms_external_sync
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
            .single();

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
