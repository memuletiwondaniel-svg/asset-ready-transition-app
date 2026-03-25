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
      return json({ success: false, message: "Username or password not configured", response_time_ms: 0 });
    }

    // Login
    const baseUrl = deriveBaseUrl(creds.base_url);
    console.log(`[test-assai] Base URL: ${baseUrl}`);

    const loginResult = await loginAssai(baseUrl, username, password);
    console.log(`[test-assai] Login: success=${loginResult.success}`);

    if (!loginResult.success) {
      return json({
        success: false,
        message: loginResult.message,
        response_time_ms: loginResult.responseTimeMs,
      });
    }

    // Get document count
    const countResult = await getDocumentCount(baseUrl, loginResult.cookies);
    console.log(`[test-assai] Count: ${countResult.count}`);

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
