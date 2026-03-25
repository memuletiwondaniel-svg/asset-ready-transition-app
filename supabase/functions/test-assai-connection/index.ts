import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        JSON.stringify({
          success: false,
          message: "No Assai credentials configured for this tenant",
          response_time_ms: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!creds.base_url) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Base URL is not configured",
          response_time_ms: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt credentials
    let username = creds.username_encrypted;
    let password = creds.password_encrypted;

    try {
      const { decrypt, isEncrypted } = await import("../_shared/crypto.ts");
      if (username && isEncrypted(username)) {
        username = await decrypt(username);
      }
      if (password && isEncrypted(password)) {
        password = await decrypt(password);
      }
    } catch (decryptErr) {
      console.error("Decryption warning:", decryptErr);
    }

    if (!username || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Username or password not configured",
          response_time_ms: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test connection — attempt authentication
    const baseUrl = creds.base_url.replace(/\/$/, "");
    const startTime = Date.now();

    try {
      const authResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const responseTimeMs = Date.now() - startTime;

      if (authResponse.ok) {
        const authData = await authResponse.json();
        const hasToken = !!(authData.token || authData.access_token || authData.sessionId);
        return new Response(
          JSON.stringify({
            success: hasToken,
            message: hasToken
              ? `Authentication successful — session token received`
              : `Authentication returned OK but no session token found`,
            response_time_ms: responseTimeMs,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const errText = await authResponse.text();
        return new Response(
          JSON.stringify({
            success: false,
            message: `HTTP ${authResponse.status}: ${errText.substring(0, 200)}`,
            response_time_ms: responseTimeMs,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (fetchErr) {
      const responseTimeMs = Date.now() - startTime;
      const message = fetchErr instanceof Error ? fetchErr.message : "Connection failed";
      return new Response(
        JSON.stringify({
          success: false,
          message: `Connection error: ${message}`,
          response_time_ms: responseTimeMs,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
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
