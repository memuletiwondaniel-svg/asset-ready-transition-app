import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  deriveBaseUrl,
  loginAssai,
  fetchAndParseDocuments,
} from "../_shared/assai-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { tenant_id, project_id, manual_trigger } = body;
    if (!tenant_id) {
      return json({ success: false, error: "tenant_id is required" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // ── 1. Fetch credentials ──
    const { data: creds, error: credError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("dms_platform", "assai")
      .single();

    if (credError || !creds) {
      return json({
        success: false,
        error: "No Assai credentials configured for this tenant",
        synced: 0, new: 0, changed: 0, failed: 0,
      });
    }

    if (!creds.sync_enabled) {
      return json({
        success: false,
        error: "Assai sync is disabled for this tenant",
        synced: 0, new: 0, changed: 0, failed: 0,
      });
    }

    if (!creds.base_url) {
      return json({
        success: false,
        error: "Platform URL is not configured",
        synced: 0, new: 0, changed: 0, failed: 0,
      });
    }

    // ── 2. Decrypt credentials ──
    let username = creds.username_encrypted;
    let password = creds.password_encrypted;

    try {
      const { decrypt, isEncrypted } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) username = await decrypt(username);
      if (password && isEncrypted(password)) password = await decrypt(password);
    } catch (decryptErr) {
      console.error("[sync-assai] Decryption warning:", decryptErr);
    }

    if (!username || !password) {
      await logSync(supabase, {
        credential_id: creds.id, tenant_id, dms_platform: "assai",
        sync_status: "failed",
        error_message: "Username or password not configured",
        triggered_by: user.id, project_id,
        error_details: { step: "precheck", reason: "missing_credentials" },
      });
      return json({
        success: false,
        error: "Username or password not configured",
        synced: 0, new: 0, changed: 0, failed: 0,
      });
    }

    // ── 3. Login to Assai Cloud ──
    const baseUrl = deriveBaseUrl(creds.base_url);
    console.log(`[sync-assai] Base URL: ${baseUrl}`);

    const loginResult = await loginAssai(baseUrl, username, password);
    console.log(`[sync-assai] Login: success=${loginResult.success}, msg=${loginResult.message}`);

    if (!loginResult.success) {
      await logSync(supabase, {
        credential_id: creds.id, tenant_id, dms_platform: "assai",
        sync_status: "failed",
        error_message: loginResult.message,
        triggered_by: user.id, project_id,
        error_details: {
          base_url: baseUrl,
          auth_steps: loginResult.debugSteps,
          response_time_ms: loginResult.responseTimeMs,
        },
      });
      return json({
        success: false,
        error: loginResult.message,
        synced: 0, new: 0, changed: 0, failed: 0,
      });
    }

    // ── 4. Fetch and parse documents ──
    const parseResult = await fetchAndParseDocuments(baseUrl, loginResult.cookies);

    if (parseResult.error && parseResult.documents.length === 0) {
      await logSync(supabase, {
        credential_id: creds.id, tenant_id, dms_platform: "assai",
        sync_status: "failed",
        error_message: parseResult.error,
        triggered_by: user.id, project_id,
        error_details: {
          base_url: baseUrl,
          auth_steps: loginResult.debugSteps,
          parse_error: parseResult.error,
        },
      });
      return json({
        success: false,
        error: parseResult.error,
        synced: 0, new: 0, changed: 0, failed: 0,
      });
    }

    if (parseResult.documents.length === 0) {
      await logSync(supabase, {
        credential_id: creds.id, tenant_id, dms_platform: "assai",
        sync_status: "success",
        synced_count: 0,
        error_message: "No documents found — check search filters in Assai",
        triggered_by: user.id, project_id,
        error_details: {
          base_url: baseUrl,
          auth_steps: loginResult.debugSteps,
          note: "No documents parsed",
        },
      });
      return json({
        success: true,
        message: "No documents found — check search filters in Assai",
        synced: 0, new: 0, changed: 0, failed: 0,
      });
    }

    // ── 5. Upsert into dms_external_sync ──
    let newCount = 0;
    let changedCount = 0;
    let failedCount = 0;
    let syncedCount = 0;

    // Fetch existing records for diff tracking
    const { data: existingDocs } = await supabase
      .from("dms_external_sync")
      .select("document_number, status_code")
      .eq("tenant_id", tenant_id)
      .eq("dms_platform", "assai");

    const existingMap = new Map(
      (existingDocs || []).map((d: any) => [d.document_number, d.status_code])
    );

    const upsertRecords = parseResult.documents.map((doc) => {
      const existing = existingMap.get(doc.document_number);
      if (!existing) newCount++;
      else if (existing !== doc.status_code) changedCount++;

      return {
        document_number: doc.document_number,
        document_title: doc.document_title,
        revision: doc.revision,
        status_code: doc.status_code,
        discipline_code: doc.discipline_code,
        package_tag: doc.package_tag,
        vendor_po_sequence: doc.vendor_po_sequence,
        dms_platform: "assai",
        last_synced_at: new Date().toISOString(),
        sync_status: "success",
        tenant_id,
        metadata: doc.metadata,
        ...(project_id ? { project_id } : {}),
      };
    });

    // Upsert in chunks
    const chunkSize = 500;
    for (let i = 0; i < upsertRecords.length; i += chunkSize) {
      const chunk = upsertRecords.slice(i, i + chunkSize);
      const { error: upsertError } = await supabase
        .from("dms_external_sync")
        .upsert(chunk, {
          onConflict: "project_id,document_number,dms_platform",
        });
      if (upsertError) {
        console.error("[sync-assai] Upsert error:", upsertError);
        failedCount += chunk.length;
      } else {
        syncedCount += chunk.length;
      }
    }

    // ── 6. Seed field mappings ──
    await seedFieldMappings(supabase, tenant_id);

    // ── 7. Update credentials and log ──
    await supabase
      .from("dms_sync_credentials")
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", creds.id);

    await logSync(supabase, {
      credential_id: creds.id, tenant_id, dms_platform: "assai",
      synced_count: syncedCount,
      failed_count: failedCount,
      new_documents: newCount,
      status_changes: changedCount,
      sync_status: failedCount > 0 && syncedCount === 0 ? "failed" : "success",
      error_message: failedCount > 0 ? `${failedCount} records failed to upsert` : null,
      triggered_by: user.id,
      project_id,
      error_details: {
        base_url: baseUrl,
        auth_steps: loginResult.debugSteps,
        parsed_rows: parseResult.documents.length,
      },
    });

    const message = `Synced ${syncedCount} documents from Assai (${newCount} new, ${changedCount} updated)`;
    console.log(`[sync-assai] ${message}`);

    return json({
      success: true,
      synced: syncedCount,
      new: newCount,
      changed: changedCount,
      failed: failedCount,
      message,
      manual_trigger: manual_trigger || false,
    });
  } catch (err) {
    console.error("[sync-assai] Unhandled error:", err);
    return json({
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
      synced: 0, new: 0, changed: 0, failed: 0,
    });
  }
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

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
      error_details: data.error_details || null,
    });
  } catch (logErr) {
    console.error("[sync-assai] Failed to write sync log:", logErr);
  }
}

async function seedFieldMappings(supabase: any, tenantId: string) {
  const mappings = [
    { platform: "assai", orsh_field: "document_number", assai_field: "Document nr.", notes: "Full ORSH-format doc number e.g. 9500-WGEL-N003-ISGP-U60000-PX-2310-09601" },
    { platform: "assai", orsh_field: "revision", assai_field: "Rev.", notes: "Current revision e.g. 02A" },
    { platform: "assai", orsh_field: "status_code", assai_field: "Status", notes: "AFU=Approved for Use, IFR=Issued for Review, AFC=Approved for Construction, IFC=Issued for Construction" },
    { platform: "assai", orsh_field: "document_title", assai_field: "Title", notes: "Full document title" },
    { platform: "assai", orsh_field: "discipline_code", assai_field: "Discipline code", notes: "e.g. PX, CG, CI — matches ORSH discipline codes" },
    { platform: "assai", orsh_field: "package_tag", assai_field: "Work package code", notes: "Assai format: ST/DP189. ORSH format: DP-189. Normalised on sync by stripping prefix before slash and inserting hyphen between letters and digits. Raw Assai value preserved in metadata.assai_work_package_code." },
    { platform: "assai", orsh_field: "vendor_po_sequence", assai_field: "Purchase order", notes: "PO number for vendor documents" },
  ];

  try {
    await supabase.from("dms_field_mappings").upsert(
      mappings.map((m) => ({ ...m, tenant_id: tenantId })),
      { onConflict: "platform,orsh_field" }
    );
  } catch (err) {
    console.error("[sync-assai] Failed to seed field mappings:", err);
  }
}
