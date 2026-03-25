import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { deriveBaseUrl, loginAssai, getDocumentCount } from "../_shared/assai-auth.ts";

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
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return json({ success: false, message: "tenant_id is required", response_time_ms: 0 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch credentials
    const { data: creds, error: credError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("dms_platform", "assai")
      .single();

    if (credError || !creds) {
      return json({ success: false, message: "No Assai credentials configured for this tenant", response_time_ms: 0 });
    }

    if (!creds.base_url) {
      return json({ success: false, message: "Platform URL is not configured", response_time_ms: 0 });
    }

    // Debug: log credential column check
    console.log('[test-assai] Credentials check:', {
      has_base_url: !!creds.base_url,
      has_username: !!creds.username_encrypted,
      has_password: !!creds.password_encrypted,
      has_db_name: !!creds.db_name,
      all_keys: Object.keys(creds),
    });

    // Decrypt
    let username = creds.username_encrypted;
    let password = creds.password_encrypted;

    try {
      const { decrypt, isEncrypted } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) username = await decrypt(username);
      if (password && isEncrypted(password)) password = await decrypt(password);
    } catch (decryptErr) {
      console.error("[test-assai] Decryption warning:", decryptErr);
    }

    if (!username || !password) {
      await logSync(supabase, {
        credential_id: creds.id,
        tenant_id,
        dms_platform: "assai",
        sync_status: "failed",
        error_message: "Username or password not configured",
        synced_count: 0,
        failed_count: 1,
        new_documents: 0,
        status_changes: 0,
        triggered_by: user.id,
        error_details: { step: "precheck", reason: "missing_credentials" },
      });
      return json({ success: false, message: "Username or password not configured", response_time_ms: 0 });
    }

    // Login
    const baseUrl = deriveBaseUrl(creds.base_url);
    console.log(`[test-assai] Base URL: ${baseUrl}`);

    const loginResult = await loginAssai(baseUrl, username, password, creds.db_name || undefined);
    console.log(`[test-assai] Login: success=${loginResult.success}`);

    if (!loginResult.success) {
      await logSync(supabase, {
        credential_id: creds.id,
        tenant_id,
        dms_platform: "assai",
        sync_status: "failed",
        error_message: loginResult.message,
        synced_count: 0,
        failed_count: 1,
        new_documents: 0,
        status_changes: 0,
        triggered_by: user.id,
        error_details: {
          base_url: baseUrl,
          auth_steps: loginResult.debugSteps,
          response_time_ms: loginResult.responseTimeMs,
        },
      });

      return json({
        success: false,
        message: loginResult.message,
        response_time_ms: loginResult.responseTimeMs,
      });
    }

    // Get document count
    const countResult = await getDocumentCount(baseUrl, loginResult.cookies);
    console.log(`[test-assai] Count: ${countResult.count}`);

    if (!countResult.success) {
      await logSync(supabase, {
        credential_id: creds.id,
        tenant_id,
        dms_platform: "assai",
        sync_status: "failed",
        error_message: countResult.message,
        synced_count: 0,
        failed_count: 1,
        new_documents: 0,
        status_changes: 0,
        triggered_by: user.id,
        error_details: {
          base_url: baseUrl,
          auth_steps: loginResult.debugSteps,
          dwr_error: countResult.message,
        },
      });

      return json({
        success: false,
        message: countResult.message,
        response_time_ms: loginResult.responseTimeMs,
      });
    }

    await logSync(supabase, {
      credential_id: creds.id,
      tenant_id,
      dms_platform: "assai",
      sync_status: "success",
      synced_count: countResult.count,
      failed_count: 0,
      new_documents: 0,
      status_changes: 0,
      triggered_by: user.id,
      error_details: {
        base_url: baseUrl,
        auth_steps: loginResult.debugSteps,
        document_count: countResult.count,
      },
    });

    return json({
      success: true,
      message: countResult.message,
      response_time_ms: loginResult.responseTimeMs,
      document_count: countResult.count,
    });
  } catch (err) {
    console.error("[test-assai] Unhandled error:", err);
    return json({
      success: false,
      message: err instanceof Error ? err.message : "Internal server error",
      response_time_ms: 0,
    });
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
      error_details: data.error_details || null,
    });
  } catch (logErr) {
    console.error("[test-assai] Failed to write sync log:", logErr);
  }
}
