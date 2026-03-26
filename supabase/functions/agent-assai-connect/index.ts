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

    // --- Attempt login via standard HTTP form POST (like a normal user) ---
    const startTime = Date.now();
    let loginSuccess = false;
    let loginMessage = "";
    let responseTimeMs = 0;

    try {
      // Selma logs in like a normal user — POST credentials to the login form
      const loginUrl = baseUrl.replace(/\/+$/, "");
      
      console.log(`[agent-assai-connect] Step 1: GET login page at ${loginUrl}`);

      // Step 1: GET the login page to establish a session and find the form action
      const pageResponse = await fetch(loginUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      const pageHtml = await pageResponse.text();
      const cookies = pageResponse.headers.get("set-cookie") || "";
      const finalUrl = pageResponse.url; // After any redirects

      console.log(`[agent-assai-connect] Login page status: ${pageResponse.status}, final URL: ${finalUrl}`);
      console.log(`[agent-assai-connect] Login page length: ${pageHtml.length} chars`);
      console.log(`[agent-assai-connect] Cookies received: ${cookies.substring(0, 200)}`);
      console.log(`[agent-assai-connect] Page preview: ${pageHtml.substring(0, 500)}`);

      // Step 2: Find the login form action URL
      const formActionMatch = pageHtml.match(/form[^>]*action\s*=\s*["']([^"']+)["']/i);
      const formAction = formActionMatch ? formActionMatch[1] : null;
      console.log(`[agent-assai-connect] Form action found: ${formAction}`);

      // Look for input field names (they might not be "username"/"password")
      const inputNames = [...pageHtml.matchAll(/<input[^>]*name\s*=\s*["']([^"']+)["'][^>]*/gi)]
        .map(m => ({ name: m[1], type: m[0].match(/type\s*=\s*["']([^"']+)["']/i)?.[1] || "text" }));
      console.log(`[agent-assai-connect] Form inputs found: ${JSON.stringify(inputNames)}`);

      // Determine the correct field names
      const userField = inputNames.find(i => /user|login|email|name/i.test(i.name))?.name || "username";
      const passField = inputNames.find(i => i.type === "password")?.name || "password";
      console.log(`[agent-assai-connect] Using fields: user=${userField}, pass=${passField}`);

      // Step 3: POST the login form
      let postUrl: string;
      if (formAction) {
        if (formAction.startsWith("http")) {
          postUrl = formAction;
        } else if (formAction.startsWith("/")) {
          const origin = new URL(finalUrl).origin;
          postUrl = `${origin}${formAction}`;
        } else {
          const base = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1);
          postUrl = `${base}${formAction}`;
        }
      } else {
        postUrl = finalUrl; // POST back to same URL
      }

      console.log(`[agent-assai-connect] Step 2: POST credentials to ${postUrl}`);

      const formBody = new URLSearchParams();
      formBody.set(userField, username);
      formBody.set(passField, password);

      const loginResponse = await fetch(postUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Cookie": cookies.split(",").map(c => c.split(";")[0].trim()).join("; "),
          "Referer": finalUrl,
        },
        body: formBody.toString(),
        redirect: "follow",
      });

      responseTimeMs = Date.now() - startTime;
      const responseText = await loginResponse.text();
      const postCookies = loginResponse.headers.get("set-cookie") || "";
      const postFinalUrl = loginResponse.url;

      console.log(`[agent-assai-connect] POST response status: ${loginResponse.status}, time: ${responseTimeMs}ms`);
      console.log(`[agent-assai-connect] POST final URL: ${postFinalUrl}`);
      console.log(`[agent-assai-connect] POST cookies: ${postCookies.substring(0, 200)}`);
      console.log(`[agent-assai-connect] POST response length: ${responseText.length} chars`);
      console.log(`[agent-assai-connect] POST response preview: ${responseText.substring(0, 500)}`);

      // Determine login success by analyzing the response
      const isRedirectedToApp = !postFinalUrl.includes("login") && !postFinalUrl.includes("loggedOff");
      const hasSessionCookie = postCookies.toLowerCase().includes("jsessionid") || postCookies.toLowerCase().includes("session");
      const hasErrorMessage = /invalid|incorrect|failed|wrong|denied|unauthorized/i.test(responseText.substring(0, 2000));
      const hasWelcome = /welcome|dashboard|home|main|frame/i.test(responseText.substring(0, 2000));

      console.log(`[agent-assai-connect] Analysis: redirectedToApp=${isRedirectedToApp}, sessionCookie=${hasSessionCookie}, error=${hasErrorMessage}, welcome=${hasWelcome}`);

      if (hasErrorMessage) {
        loginSuccess = false;
        loginMessage = `Login rejected — invalid credentials (${responseTimeMs}ms)`;
      } else if (isRedirectedToApp || hasSessionCookie || hasWelcome) {
        loginSuccess = true;
        loginMessage = `Selma logged in successfully · ${responseTimeMs}ms`;
      } else if (loginResponse.status >= 400) {
        loginSuccess = false;
        loginMessage = `Login failed with HTTP ${loginResponse.status} (${responseTimeMs}ms)`;
      } else {
        // Ambiguous — log details for debugging
        loginSuccess = false;
        loginMessage = `Login response ambiguous (${responseTimeMs}ms). Status: ${loginResponse.status}, URL: ${postFinalUrl}. Check edge function logs for details.`;
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
