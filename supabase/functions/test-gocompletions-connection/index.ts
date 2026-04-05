import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  loginGoCompletions,
  formatCookies,
  followRedirects,
} from "../_shared/gocompletions-auth.ts";

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

    const { data: creds, error: credsError } = await supabase
      .from("dms_sync_credentials")
      .select("*")
      .eq("dms_platform", "gocompletions")
      .limit(1)
      .single();

    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ success: false, error: "No GoCompletions credentials configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const portalUrl = creds.base_url || "";
    const username = creds.username_encrypted || "";
    const password = String(creds.password_encrypted ?? "");

    console.log(`[test-goc] portal_url=${portalUrl}, username=${username}, password_length=${password.length}`);

    if (!portalUrl || !username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Incomplete credentials: portal URL, username, and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const start = Date.now();

    try {
      await loginGoCompletions(portalUrl, username, password);
      const elapsed = Date.now() - start;
      console.log(`[test-goc] Login successful, elapsed=${elapsed}ms`);

      return new Response(
        JSON.stringify({ success: true, response_time_ms: elapsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (loginErr: any) {
      const elapsed = Date.now() - start;
      const msg = loginErr.message || "Login failed";
      return new Response(
        JSON.stringify({ success: false, error: msg, response_time_ms: elapsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err: any) {
    console.error("[test-goc] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Connection failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
