import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegistrationRequestBody {
  authenticatorId: string;
  userData: {
    user_id?: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    personal_email?: string | null;
    functional_email: boolean;
    phone_number: string;
    company: string;
    job_title: string;
    ta2_discipline?: string | null;
    ta2_commission?: string | null;
    comments?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authenticatorId, userData }: RegistrationRequestBody = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate a user_id if not provided
    const user_id = userData.user_id ?? crypto.randomUUID();

    // Insert pending profile using service role (bypasses RLS safely)
    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        full_name: userData.full_name,
        email: userData.email,
        personal_email: userData.personal_email ?? null,
        functional_email: userData.functional_email,
        phone_number: userData.phone_number,
        company: userData.company as any,
        job_title: userData.job_title,
        ta2_discipline: (userData.ta2_discipline ?? null) as any,
        ta2_commission: (userData.ta2_commission ?? null) as any,
        status: 'pending_approval' as any,
        rejection_reason: userData.comments ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ success: false, error: insertError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fire email to authenticator using existing function
    const { error: emailError } = await supabase.functions.invoke('send-user-approval-request', {
      body: {
        authenticatorId,
        userData,
        requestId: user_id,
      }
    });

    if (emailError) {
      console.error('Email error (non-blocking):', emailError);
    }

    return new Response(JSON.stringify({ success: true, profile: inserted }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error('submit-registration-request error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});