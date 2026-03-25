import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encrypt, decrypt, isEncrypted } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID");
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET");
const MICROSOFT_TENANT_ID = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.ReadWrite",
  "User.Read",
].join(" ");

const ACCESS_TOKEN_PLACEHOLDER = "[not-stored]";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/** Decrypt a refresh token, handling legacy plaintext gracefully */
async function decryptRefreshToken(storedValue: string): Promise<string> {
  if (isEncrypted(storedValue)) {
    return await decrypt(storedValue);
  }
  // Legacy plaintext — return as-is (will be re-encrypted on next write)
  return storedValue;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
      console.error("Missing Microsoft OAuth credentials");
      return new Response(
        JSON.stringify({ error: "Microsoft OAuth not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (action) {
      case "authorize": {
        const { redirectUri, state } = await req.json();
        
        const authUrl = new URL(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`);
        authUrl.searchParams.set("client_id", MICROSOFT_CLIENT_ID);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("scope", SCOPES);
        authUrl.searchParams.set("response_mode", "query");
        authUrl.searchParams.set("state", state || "");
        authUrl.searchParams.set("prompt", "consent");

        console.log("Generated Microsoft auth URL");
        
        return new Response(
          JSON.stringify({ authUrl: authUrl.toString() }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "callback": {
        const { code, redirectUri, userId } = await req.json();

        if (!code || !redirectUri || !userId) {
          return new Response(
            JSON.stringify({ error: "Missing required parameters: code, redirectUri, userId" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const tokenUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
        
        const tokenParams = new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          client_secret: MICROSOFT_CLIENT_SECRET,
          code: code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: SCOPES,
        });

        const tokenResponse = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenParams.toString(),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          console.error("Token exchange failed:", errorData);
          return new Response(
            JSON.stringify({ error: "Failed to exchange authorization code", details: errorData }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const tokens: TokenResponse = await tokenResponse.json();
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Encrypt refresh token before storage
        const encryptedRefreshToken = await encrypt(tokens.refresh_token);

        // Store encrypted refresh token; access_token is NOT persisted
        const { error: upsertError } = await supabase
          .from("microsoft_oauth_tokens")
          .upsert({
            user_id: userId,
            access_token: ACCESS_TOKEN_PLACEHOLDER,
            refresh_token: encryptedRefreshToken,
            expires_at: expiresAt.toISOString(),
            scope: tokens.scope,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (upsertError) {
          console.error("Failed to store tokens:", upsertError);
          return new Response(
            JSON.stringify({ error: "Failed to store tokens", details: upsertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Successfully stored encrypted Microsoft OAuth tokens for user:", userId);

        return new Response(
          JSON.stringify({ success: true, expiresAt: expiresAt.toISOString() }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "refresh": {
        const { userId } = await req.json();

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Missing userId" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Service role bypasses column-level revoke
        const { data: tokenData, error: fetchError } = await supabase
          .from("microsoft_oauth_tokens")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (fetchError || !tokenData) {
          return new Response(
            JSON.stringify({ error: "No tokens found for user" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Decrypt stored refresh token
        const plaintextRefreshToken = await decryptRefreshToken(tokenData.refresh_token);

        const tokenUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
        
        const refreshParams = new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          client_secret: MICROSOFT_CLIENT_SECRET,
          refresh_token: plaintextRefreshToken,
          grant_type: "refresh_token",
          scope: SCOPES,
        });

        const refreshResponse = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: refreshParams.toString(),
        });

        if (!refreshResponse.ok) {
          const errorData = await refreshResponse.text();
          console.error("Token refresh failed:", errorData);
          
          await supabase
            .from("microsoft_oauth_tokens")
            .delete()
            .eq("user_id", userId);
            
          return new Response(
            JSON.stringify({ error: "Token refresh failed, reconnection required" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const tokens: TokenResponse = await refreshResponse.json();
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Encrypt the new (or existing) refresh token
        const newRefreshToken = tokens.refresh_token || plaintextRefreshToken;
        const encryptedRefreshToken = await encrypt(newRefreshToken);

        // Update with encrypted refresh token; access_token NOT persisted
        const { error: updateError } = await supabase
          .from("microsoft_oauth_tokens")
          .update({
            access_token: ACCESS_TOKEN_PLACEHOLDER,
            refresh_token: encryptedRefreshToken,
            expires_at: expiresAt.toISOString(),
            scope: tokens.scope,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Failed to update tokens:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update tokens" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Successfully refreshed Microsoft OAuth tokens for user:", userId);

        // Return fresh access token directly (never stored)
        return new Response(
          JSON.stringify({ 
            success: true, 
            accessToken: tokens.access_token,
            expiresAt: expiresAt.toISOString() 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "No authorization header" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: "Invalid token" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Only need safe columns for status check
        const { data: tokenData, error: fetchError } = await supabase
          .from("microsoft_oauth_tokens")
          .select("expires_at")
          .eq("user_id", user.id)
          .single();

        if (fetchError || !tokenData) {
          return new Response(
            JSON.stringify({ connected: false }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const isExpired = new Date(tokenData.expires_at) < new Date();

        return new Response(
          JSON.stringify({ 
            connected: true, 
            isExpired,
            expiresAt: tokenData.expires_at 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disconnect": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "No authorization header" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: "Invalid token" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: deleteError } = await supabase
          .from("microsoft_oauth_tokens")
          .delete()
          .eq("user_id", user.id);

        if (deleteError) {
          console.error("Failed to disconnect:", deleteError);
          return new Response(
            JSON.stringify({ error: "Failed to disconnect Microsoft account" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Successfully disconnected Microsoft account for user:", user.id);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    console.error("Microsoft OAuth error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);