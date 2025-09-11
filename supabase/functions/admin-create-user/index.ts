import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  company?: string | null;
  role?: string | null;
  phone?: string | null;
  personalEmail?: string | null;
  isFunctionalEmail?: boolean;
  discipline?: string | null;
  commission?: string | null;
  privileges?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase environment." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body: CreateUserRequest = await req.json();
    const {
      email,
      firstName,
      lastName,
      password,
      company,
      role,
      phone,
      personalEmail,
      isFunctionalEmail,
      discipline,
      commission,
    } = body;

    if (!email || !firstName || !lastName || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 1) Create auth user (email confirmed)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createErr || !created.user) {
      console.error("createUser error:", createErr);
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create auth user" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = created.user.id;

    // Normalize company to enum if supported (only set when known)
    const normalizedCompany = company === 'BGC' || company === 'Kent' ? company : null;

    // 2) Insert profile
    const { error: profileErr } = await admin
      .from('profiles')
      .insert({
        user_id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        company: normalizedCompany as any,
        phone_number: phone ?? null,
        personal_email: personalEmail ?? null,
        functional_email: !!isFunctionalEmail,
        status: 'active',
        role: role || 'user',
        ta2_discipline: discipline ?? null,
        ta2_commission: commission ?? null,
        account_status: 'active',
      });

    if (profileErr) {
      console.error("insert profile error:", profileErr);
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // We intentionally skip assigning privileges/roles here to avoid enum mismatch.

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("admin-create-user unexpected error:", e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
