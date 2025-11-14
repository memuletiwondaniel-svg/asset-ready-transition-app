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
    final_role?: string;
    company?: 'BGC' | 'KENT' | null;
    status?: 'active' | 'inactive' | 'pending_approval' | 'suspended';
    account_status?: string;
    sso_enabled?: boolean;
    two_factor_enabled?: boolean;
    password_change_required?: boolean;
    functional_email?: boolean;
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

    // Prepare update payload and map role name -> roles.id (UUID)
    const updateData: any = { ...profileData };

    if (typeof profileData.role === 'string' && profileData.role.trim()) {
      const roleInput = profileData.role.trim();
      let roleId = roleInput;

      // If the role isn't a UUID, treat it as a role name and look up its id
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(roleInput);
      if (!isUuid) {
        const { data: roleRow, error: roleLookupErr } = await admin
          .from('roles')
          .select('id')
          .eq('name', roleInput)
          .eq('is_active', true)
          .maybeSingle();

        if (roleLookupErr || !roleRow?.id) {
          console.error('update-user-profile: role lookup failed', roleLookupErr);
          return new Response(
            JSON.stringify({ error: `Role not found: ${roleInput}` }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        roleId = roleRow.id;
      }

      updateData.role = roleId;
    }

    // Ensure we don't send non-existent columns
    delete updateData.final_role;
    delete updateData.employee_id;
    
    // Position is now a text field, so we can keep it as-is
    // No need to delete it unless it's null/undefined

    // Update the profile atomically using service role
    const { data, error: updateErr } = await admin
      .from('profiles')
      .update(updateData)
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

    // Sync first_name, last_name, and full_name to auth.users.raw_user_meta_data
    if (profileData.first_name || profileData.last_name || profileData.full_name) {
      const metadataUpdate: any = {};
      if (profileData.first_name !== undefined) metadataUpdate.first_name = profileData.first_name;
      if (profileData.last_name !== undefined) metadataUpdate.last_name = profileData.last_name;
      if (profileData.full_name !== undefined) metadataUpdate.full_name = profileData.full_name;

      const { error: authUpdateErr } = await admin.auth.admin.updateUserById(userId, {
        user_metadata: metadataUpdate
      });

      if (authUpdateErr) {
        console.error('update-user-profile: auth metadata update error', authUpdateErr);
        // Don't fail the request if auth update fails, just log it
      } else {
        console.log('Auth metadata updated successfully with names');
      }
    }

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