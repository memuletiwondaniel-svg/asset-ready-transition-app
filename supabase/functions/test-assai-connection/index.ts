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

    // Verify user JWT
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

    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ success: false, message: "tenant_id is required", response_time_ms: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch Assai credentials
    const { data: creds, error: credError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("dms_platform", "assai")
      .single();

    if (credError || !creds) {
      return new Response(
        JSON.stringify({ success: false, message: "No Assai credentials configured for this tenant", response_time_ms: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!creds.base_url) {
      return new Response(
        JSON.stringify({ success: false, message: "Platform URL is not configured", response_time_ms: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt credentials
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
      return new Response(
        JSON.stringify({ success: false, message: "Username or password not configured", response_time_ms: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Derive API base URL and attempt authentication
    const baseUrl = deriveBaseUrl(creds.base_url);
    console.log(`[test-assai] Derived base URL: ${baseUrl} from stored: ${creds.base_url}`);

    const authResult = await authenticateAssai(baseUrl, username, password);

    console.log(`[test-assai] Auth result: success=${authResult.success}, attempts=${authResult.attempts.length}`);
    for (const a of authResult.attempts) {
      console.log(`[test-assai]   ${a.endpoint} → ${a.status}: ${a.body.substring(0, 200)}`);
    }

    if (authResult.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Authentication successful via ${authResult.endpointUsed}`,
          response_time_ms: authResult.responseTimeMs,
          endpoint_used: authResult.endpointUsed,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build descriptive failure message
    const lastAttempt = authResult.attempts[authResult.attempts.length - 1];
    const statusHint = lastAttempt?.status
      ? `returned HTTP ${lastAttempt.status}`
      : "connection failed";

    return new Response(
      JSON.stringify({
        success: false,
        message: `Authentication failed — ${statusHint}. Tried ${authResult.attempts.length} endpoint(s). Check credentials and Platform URL.`,
        response_time_ms: authResult.responseTimeMs,
        attempts: authResult.attempts.map(a => ({ endpoint: a.endpoint, status: a.status })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
        response_time_ms: 0,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
