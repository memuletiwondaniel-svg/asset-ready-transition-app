import { createClient } from "jsr:@supabase/supabase-js@2";
import { decrypt, isEncrypted } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth guard ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Fetch credentials from dms_sync_credentials ---
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: creds, error: credsErr } = await serviceClient
      .from("dms_sync_credentials")
      .select("*")
      .eq("dms_platform", "assai")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (credsErr) {
      console.error("[agent-assai-connect] Credentials fetch error:", credsErr);
      return new Response(JSON.stringify({ success: false, error: "Failed to fetch credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!creds) {
      return new Response(JSON.stringify({
        success: false,
        error: "No Assai credentials configured. Please save your connection settings first.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Decrypt credentials ---
    const baseUrl = creds.base_url || "";
    let username = creds.username_encrypted || "";
    let password = creds.password_encrypted || "";

    if (username && isEncrypted(username)) {
      username = await decrypt(username);
    }
    if (password && isEncrypted(password)) {
      password = await decrypt(password);
    }

    if (!baseUrl || !username || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: "Incomplete credentials — base URL, username, and password are all required.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[agent-assai-connect] Testing connection to ${baseUrl} as ${username}`);

    // --- Fetch navigation steps ---
    const { data: steps, error: stepsErr } = await serviceClient
      .from("agent_navigation_steps")
      .select("*")
      .eq("platform", "assai")
      .eq("is_active", true)
      .order("step_order", { ascending: true });

    if (stepsErr) {
      console.error("[agent-assai-connect] Nav steps fetch error:", stepsErr);
    }

    const stepCount = steps?.length ?? 0;
    console.log(`[agent-assai-connect] Loaded ${stepCount} navigation steps`);

    // --- Attempt login via HTTP (simulating agent's first step) ---
    // Step 1: Fetch the login page to get session cookies
    const startTime = Date.now();
    let loginSuccess = false;
    let loginMessage = "";
    let responseTimeMs = 0;

    try {
      // Try DWR-based login (Assai uses Direct Web Remoting)
      // Strip everything after the app context root (e.g., /AWeu578) — remove index.aweb, query params, trailing slashes
      const appRoot = baseUrl.replace(/\/+$/, "").split(/\/(index\.aweb|login\.html|dwr\/)/i)[0];
      const sessionUrl = `${appRoot}/dwr/call/plaincall/LoginBean.getSessionID.dwr`;

      console.log(`[agent-assai-connect] Derived app root: ${appRoot}`);

      const dwrBody = [
        "callCount=1",
        "windowName=",
        "c0-scriptName=LoginBean",
        "c0-methodName=getSessionID",
        `c0-param0=string:${encodeURIComponent(username)}`,
        `c0-param1=string:${encodeURIComponent(password)}`,
        "c0-param2=string:",
        "batchId=0",
        `page=${appRoot}/login.html`,
        "httpSessionId=",
        `scriptSessionId=`,
      ].join("\n");

      console.log(`[agent-assai-connect] Attempting DWR login at ${sessionUrl}`);

      const loginResponse = await fetch(sessionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "ORSH-Agent-Selma/1.0",
        },
        body: dwrBody,
      });

      responseTimeMs = Date.now() - startTime;
      const responseText = await loginResponse.text();

      console.log(`[agent-assai-connect] DWR response status: ${loginResponse.status}, time: ${responseTimeMs}ms`);
      console.log(`[agent-assai-connect] DWR response length: ${responseText.length} chars`);
      console.log(`[agent-assai-connect] DWR response preview: ${responseText.substring(0, 500)}`);

      // Check for fast rejection (< 300ms typically means the request didn't reach auth logic)
      if (responseTimeMs < 300 && responseText.length < 100) {
        loginMessage = `Fast rejection detected (${responseTimeMs}ms) — DWR endpoint may not be accessible. Response: ${responseText.substring(0, 200)}`;
        console.warn(`[agent-assai-connect] ${loginMessage}`);
        loginSuccess = false;
      } else {
        // Parse DWR response for passphrase/session ID
        // DWR responses contain: var s0="sessionid"; or dwr.engine._remoteHandleCallback('0','0',"sessionid")
        const passphrasePatterns = [
          /var\s+s\d+\s*=\s*"([^"]+)"/,
          /dwr\.engine\._remoteHandleCallback\([^,]+,[^,]+,"([^"]+)"\)/,
          /handleCallback\([^,]+,[^,]+,"([^"]+)"\)/,
        ];

        let passphrase: string | null = null;
        for (const pattern of passphrasePatterns) {
          const match = responseText.match(pattern);
          if (match) {
            passphrase = match[1];
            console.log(`[agent-assai-connect] Passphrase extracted via pattern: ${pattern.source}`);
            break;
          }
        }

        if (passphrase && passphrase.length > 5) {
          loginSuccess = true;
          loginMessage = `Agent login successful · ${responseTimeMs}ms · Session obtained`;
          console.log(`[agent-assai-connect] Login SUCCESS — passphrase length: ${passphrase.length}`);
        } else if (responseText.includes("error") || responseText.includes("Error") || responseText.includes("exception")) {
          loginSuccess = false;
          loginMessage = `Login rejected by server (${responseTimeMs}ms). Check credentials.`;
          console.warn(`[agent-assai-connect] Login FAILED — error in response`);
        } else if (passphrase === null) {
          loginSuccess = false;
          loginMessage = `DWR passphrase extraction failed — regex did not match DWR response (${responseTimeMs}ms). Response preview: ${responseText.substring(0, 200)}`;
          console.warn(`[agent-assai-connect] ${loginMessage}`);
        } else {
          loginSuccess = false;
          loginMessage = `Login returned empty/short session (${responseTimeMs}ms). Credentials may be invalid.`;
          console.warn(`[agent-assai-connect] Login FAILED — passphrase too short: "${passphrase}"`);
        }
      }
    } catch (fetchErr: any) {
      responseTimeMs = Date.now() - startTime;
      loginSuccess = false;
      loginMessage = `Connection error: ${fetchErr.message} (${responseTimeMs}ms)`;
      console.error(`[agent-assai-connect] Fetch error:`, fetchErr);
    }

    // --- Log the sync attempt ---
    await serviceClient.from("dms_sync_logs").insert({
      dms_platform: "assai",
      sync_status: loginSuccess ? "success" : "failed",
      sync_route_used: "agent",
      error_message: loginSuccess ? null : loginMessage,
      triggered_by: user.id,
      tenant_id: creds.tenant_id,
    });

    return new Response(JSON.stringify({
      success: loginSuccess,
      message: loginMessage,
      response_time_ms: responseTimeMs,
      method: "agent",
      steps_loaded: stepCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[agent-assai-connect] Unhandled error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message || "Internal server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
