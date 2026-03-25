import { createClient } from "jsr:@supabase/supabase-js@2";
import { loginAssai } from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

      // Derive the AA-prefix API base from the resolved base
      const apiBase = resolvedBase.replace(/\/AW([^/]+)/, "/AA$1");
      console.log(`[sync-assai] Using API base: ${apiBase}`);

      // Probe OAuth endpoints to find the right one
      const clientId = resolvedDb || "eu578";
      const tokenEndpoints = [
        `${apiBase}/oauth/token`,
        `${apiBase}/api/oauth/token`,
        `${apiBase}/api/v1/oauth/token`,
        `${apiBase}/token`,
        `${resolvedBase.split('/AW')[0]}/AAeu578/oauth/token`,
      ];

      for (const endpoint of tokenEndpoints) {
        try {
          const r = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "password",
              client_id: clientId,
              username: username,
              password: password,
            }).toString(),
          });
          const t = await r.text();
          console.log(`[sync-assai] TOKEN PROBE ${endpoint} => status=${r.status}, body=${t.substring(0, 200)}`);
        } catch (e) {
          console.log(`[sync-assai] TOKEN PROBE ${endpoint} => ERROR: ${e}`);
        }
      }

      // Step 2: Fetch documents from REST API using session cookies
      const docsUrl = `${resolvedBase}/AA${resolvedDb}/api/v1/documents`;
      console.log(`[sync-assai] Correct docs URL: ${docsUrl}`);

      const docsResp = await fetch(docsUrl, {
        method: "GET",
        headers: {
          "Cookie": sessionCookies.join("; "),
          "Accept": "application/json",
        },
      });

      console.log(`[sync-assai] Documents response status=${docsResp.status}`);

      const respText = await docsResp.text();
      console.log(`[sync-assai] Response preview: ${respText.substring(0, 500)}`);

      if (!docsResp.ok) {
        throw new Error(`Documents API returned ${docsResp.status}: ${respText.substring(0, 300)}`);
      }

      const docsJson = JSON.parse(respText);

      // Handle both array and paginated response formats
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
