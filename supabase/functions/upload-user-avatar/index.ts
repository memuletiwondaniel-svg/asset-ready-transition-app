import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UploadAvatarRequest {
  userId: string;
  fileExt: string; // e.g. 'png', 'jpg'
  contentType: string; // e.g. 'image/png'
  base64: string; // raw base64 string (no data URL prefix)
}

function base64ToUint8Array(base64: string): Uint8Array {
  // atob returns a binary string where each charCode is a byte
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- JWT Auth Guard ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: _claimsData, error: _claimsError } = await _authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (_claimsError || !_claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const _callerUserId = _claimsData.claims.sub as string;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body: UploadAvatarRequest = await req.json();
    const { userId, fileExt, contentType, base64 } = body || ({} as any);

    if (!userId || !fileExt || !contentType || !base64) {
      return new Response(
        JSON.stringify({ error: "userId, fileExt, contentType and base64 are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Decode base64 to bytes and enforce ~5MB limit
    const fileBytes = base64ToUint8Array(base64);
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (fileBytes.byteLength > maxBytes) {
      return new Response(JSON.stringify({ error: "File too large (max 5MB)" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const path = `${userId}/${Date.now()}.${fileExt.replace(/^\./, "")}`;

    // Upload file using service role to bypass RLS
    const { error: uploadErr } = await admin.storage
      .from("user-avatars")
      .upload(path, fileBytes, { contentType, upsert: true });

    if (uploadErr) {
      console.error("upload-user-avatar: storage upload error", uploadErr);
      return new Response(JSON.stringify({ error: uploadErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update profile avatar_url
    const { error: updateErr } = await admin
      .from("profiles")
      .update({ avatar_url: path })
      .eq("user_id", userId);

    if (updateErr) {
      console.error("upload-user-avatar: profile update error", updateErr);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/user-avatars/${path}`;

    return new Response(JSON.stringify({ success: true, path, publicUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("upload-user-avatar: unexpected error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
