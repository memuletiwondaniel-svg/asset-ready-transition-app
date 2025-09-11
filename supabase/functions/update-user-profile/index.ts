import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateProfileRequest {
  userId: string;
  profileData: {
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    email?: string;
    personal_email?: string | null;
    functional_email_address?: string | null;
    phone_number?: string | null;
    primary_phone?: string | null;
    secondary_phone?: string | null;
    country_code?: string | null;
    job_title?: string | null;
    department?: string | null;
    employee_id?: string | null;
    role?: string;
    company?: 'BGC' | 'KENT' | null;
    status?: 'active' | 'inactive' | 'pending_approval' | 'suspended';
    account_status?: string;
    sso_enabled?: boolean;
    two_factor_enabled?: boolean;
    password_change_required?: boolean;
    functional_email?: boolean;
    ta2_discipline?: string | null;
    ta2_commission?: string | null;
    position?: string | null;
    updated_at?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const body: UpdateProfileRequest = await req.json();
    const { userId, profileData } = body || {} as any;

    if (!userId || !profileData) {
      return new Response(JSON.stringify({ error: "userId and profileData are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Updating profile for user:', userId, 'with data:', profileData);

    // Update the profile atomically using service role
    const { data, error: updateErr } = await admin
      .from('profiles')
      .update(profileData)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateErr) {
      console.error('update-user-profile: update error', updateErr);
      return new Response(JSON.stringify({ error: updateErr.message, details: updateErr }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Profile updated successfully:', data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error('update-user-profile: unexpected error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});