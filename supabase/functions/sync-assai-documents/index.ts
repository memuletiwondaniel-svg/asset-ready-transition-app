import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { deriveBaseUrl, authenticateAssai } from "../_shared/assai-auth.ts";

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
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request — project_id is optional for manual sync
    const body = await req.json();
    const { tenant_id, project_id, manual_trigger } = body;
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch credentials
    const { data: creds, error: credError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("dms_platform", "assai")
      .single();

    if (credError || !creds) {
      return new Response(
        JSON.stringify({ success: false, error: "No Assai credentials configured for this tenant" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!creds.sync_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: "Assai sync is disabled for this tenant" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!creds.base_url) {
      return new Response(
        JSON.stringify({ success: false, error: "Platform URL is not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Decrypt credentials
    let username = creds.username_encrypted;
    let password = creds.password_encrypted;

    try {
      const { decrypt, isEncrypted } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) username = await decrypt(username);
      if (password && isEncrypted(password)) password = await decrypt(password);
    } catch (decryptErr) {
      console.error("Decryption warning:", decryptErr);
    }

    if (!username || !password) {
      await logSync(supabase, {
        credential_id: creds.id, tenant_id, dms_platform: "assai",
        sync_status: "failed", error_message: "Username or password not configured",
        triggered_by: user.id, project_id,
      });
      return new Response(
        JSON.stringify({ success: false, error: "Username or password not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Derive base URL and authenticate
    const baseUrl = deriveBaseUrl(creds.base_url);
    console.log(`[sync-assai] Derived base URL: ${baseUrl} from stored: ${creds.base_url}`);

    const authResult = await authenticateAssai(baseUrl, username, password);

    console.log(`[sync-assai] Auth result: success=${authResult.success}, attempts=${authResult.attempts.length}`);
    for (const a of authResult.attempts) {
      console.log(`[sync-assai]   ${a.endpoint} → ${a.status}: ${a.body.substring(0, 200)}`);
    }

    if (!authResult.success) {
      const errorDetail = {
        error: "Authentication failed",
        attempts: authResult.attempts.map(a => ({
          endpoint: a.endpoint,
          status: a.status,
          body: a.body.substring(0, 300),
        })),
      };

      await logSync(supabase, {
        credential_id: creds.id, tenant_id, dms_platform: "assai",
        sync_status: "failed",
        error_message: `Authentication failed after ${authResult.attempts.length} attempts. ` +
          authResult.attempts.map(a => `${a.endpoint} → ${a.status}`).join("; "),
        triggered_by: user.id, project_id,
      });

      // Build user-friendly message
      const lastAttempt = authResult.attempts[authResult.attempts.length - 1];
      const hint = lastAttempt?.status
        ? `Authentication returned ${lastAttempt.status} — check your credentials`
        : "Could not reach the Assai server — check your Platform URL";

      return new Response(
        JSON.stringify({
          success: false,
          error: hint,
          synced_count: 0, failed_count: 0, new_documents: 0, status_changes: 0,
          auth_attempts: errorDetail.attempts,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Fetch documents
    const token = authResult.token!;
    let syncResult = { synced_count: 0, failed_count: 0, new_documents: 0, status_changes: 0 };
    let syncError: string | null = null;

    try {
      // Try /api/documents first, then /api/documentregister
      let docsResponse = await fetch(`${baseUrl}/api/documents`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (!docsResponse.ok) {
        const firstBody = await docsResponse.text();
        console.log(`[sync-assai] /api/documents returned ${docsResponse.status}: ${firstBody.substring(0, 200)}`);

        docsResponse = await fetch(`${baseUrl}/api/documentregister`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
      }

      if (!docsResponse.ok) {
        const errText = await docsResponse.text();
        console.log(`[sync-assai] Document fetch failed: ${docsResponse.status}: ${errText.substring(0, 500)}`);
        throw new Error(`Document fetch failed (${docsResponse.status}): ${errText.substring(0, 200)}`);
      }

      const docsBody = await docsResponse.text();
      console.log(`[sync-assai] Document response (first 500 chars): ${docsBody.substring(0, 500)}`);

      const documents = JSON.parse(docsBody);
      const docList = Array.isArray(documents)
        ? documents
        : documents.data || documents.documents || documents.Items || [];

      // If we have a project_id, scope the upsert
      if (project_id && docList.length > 0) {
        const { data: existingDocs } = await supabase
          .from("dms_external_sync")
          .select("document_number, status_code")
          .eq("project_id", project_id)
          .eq("dms_platform", "assai");

        const existingMap = new Map(
          (existingDocs || []).map((d: any) => [d.document_number, d.status_code])
        );

        const upsertRecords = docList.map((doc: any) => ({
          project_id,
          document_number: doc.documentNumber || doc.document_number || doc.DocumentNumber || "",
          document_title: doc.title || doc.documentTitle || doc.DocumentTitle || "",
          revision: doc.revision || doc.Revision || null,
          status_code: doc.statusCode || doc.status || doc.StatusCode || null,
          discipline_code: doc.discipline || doc.disciplineCode || doc.DisciplineCode || null,
          package_tag: doc.packageTag || doc.package_tag || doc.PackageTag || null,
          vendor_po_sequence: doc.vendorPoSequence || doc.vendor_po_sequence || doc.VendorPOSequence || null,
          dms_platform: "assai",
          external_url: doc.url || doc.externalUrl || doc.link || null,
          last_synced_at: new Date().toISOString(),
          sync_status: "success",
          tenant_id,
        }));

        for (const rec of upsertRecords) {
          const existing = existingMap.get(rec.document_number);
          if (!existing) syncResult.new_documents++;
          else if (existing !== rec.status_code) syncResult.status_changes++;
        }

        const chunkSize = 500;
        for (let i = 0; i < upsertRecords.length; i += chunkSize) {
          const chunk = upsertRecords.slice(i, i + chunkSize);
          const { error: upsertError } = await supabase
            .from("dms_external_sync")
            .upsert(chunk, { onConflict: "project_id,document_number,dms_platform" });
          if (upsertError) {
            console.error("[sync-assai] Upsert error:", upsertError);
            syncResult.failed_count += chunk.length;
          } else {
            syncResult.synced_count += chunk.length;
          }
        }
      } else {
        // No project_id — just report what we found
        syncResult.synced_count = docList.length;
      }
    } catch (apiError) {
      console.error("[sync-assai] Sync error:", apiError);
      syncError = apiError instanceof Error ? apiError.message : "Unknown sync error";
      syncResult.failed_count++;
    }

    // 5. Update last_sync_at
    await supabase
      .from("dms_sync_credentials")
      .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", creds.id);

    // 6. Log to dms_sync_logs
    await logSync(supabase, {
      credential_id: creds.id, tenant_id, dms_platform: "assai",
      synced_count: syncResult.synced_count,
      failed_count: syncResult.failed_count,
      new_documents: syncResult.new_documents,
      status_changes: syncResult.status_changes,
      sync_status: syncError ? "failed" : "success",
      error_message: syncError,
      triggered_by: user.id, project_id,
    });

    return new Response(
      JSON.stringify({
        success: !syncError,
        ...syncResult,
        error: syncError,
        manual_trigger: manual_trigger || false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
        synced_count: 0, failed_count: 0, new_documents: 0, status_changes: 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logSync(supabase: any, data: Record<string, unknown>) {
  try {
    await supabase.from("dms_sync_logs").insert({
      credential_id: data.credential_id,
      project_id: data.project_id || null,
      dms_platform: data.dms_platform,
      synced_count: data.synced_count || 0,
      failed_count: data.failed_count || 0,
      new_documents: data.new_documents || 0,
      status_changes: data.status_changes || 0,
      sync_status: data.sync_status,
      error_message: data.error_message || null,
      triggered_by: data.triggered_by,
      tenant_id: data.tenant_id,
    });
  } catch (logErr) {
    console.error("[sync-assai] Failed to write sync log:", logErr);
  }
}
