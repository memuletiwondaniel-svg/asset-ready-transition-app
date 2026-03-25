import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decrypt, encrypt, isEncrypted } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT auth guard
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, isBackupCode } = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ error: "Code is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use service role to read secrets
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("two_factor_secret, two_factor_backup_codes, two_factor_enabled")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!profile.two_factor_enabled) {
      return new Response(
        JSON.stringify({ error: "2FA is not enabled" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (isBackupCode) {
      // Decrypt backup codes
      const rawBackupCodes = profile.two_factor_backup_codes;
      let backupCodes: string[] = [];

      if (Array.isArray(rawBackupCodes) && rawBackupCodes.length > 0) {
        const firstEntry = rawBackupCodes[0];
        if (typeof firstEntry === "string" && isEncrypted(firstEntry)) {
          // New encrypted format: single encrypted JSON blob stored as first array element
          const decryptedJson = await decrypt(firstEntry);
          backupCodes = JSON.parse(decryptedJson);
        } else {
          // Legacy plaintext format: array of plain strings
          backupCodes = rawBackupCodes as string[];
        }
      }

      const normalizedCode = code.trim().toLowerCase();
      const codeIndex = backupCodes.findIndex(
        (bc: string) => bc.toLowerCase() === normalizedCode
      );

      if (codeIndex === -1) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid backup code" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Remove used backup code and re-encrypt
      const updatedCodes = [...backupCodes];
      updatedCodes.splice(codeIndex, 1);
      const encryptedUpdated = await encrypt(JSON.stringify(updatedCodes));

      await adminClient
        .from("profiles")
        .update({ two_factor_backup_codes: [encryptedUpdated] })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          valid: true,
          remainingBackupCodes: updatedCodes.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // Verify TOTP code
      const { authenticator } = await import("https://esm.sh/otplib@12.0.1");
      authenticator.options = { window: 1 };

      let secret = profile.two_factor_secret;
      if (!secret) {
        return new Response(
          JSON.stringify({ valid: false, error: "No 2FA secret configured" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Decrypt if encrypted, otherwise handle legacy plaintext
      if (isEncrypted(secret)) {
        secret = await decrypt(secret);
      }

      const isValid = authenticator.verify({ token: code, secret });

      return new Response(JSON.stringify({ valid: isValid }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("verify-totp error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
