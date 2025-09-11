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
  functionalEmail?: string | null;
  isFunctionalEmail?: boolean;
  discipline?: string | null;
  commission?: string | null;
  systemRole?: string;
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
      functionalEmail,
      isFunctionalEmail,
      discipline,
      commission,
      systemRole,
    } = body;

    if (!email || !firstName || !lastName || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Determine which email to use for authentication
    // If this is a functional email setup, use personal email for auth
    const authEmail = (isFunctionalEmail && personalEmail) ? personalEmail : email;
    
    // 1) Create auth user (email confirmed)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createErr || !created.user) {
      // Handle case where user already exists by email
      if (createErr?.message && createErr.message.includes('already been registered')) {
        // Try to locate existing profile to obtain user_id
        const { data: existingProfile } = await admin
          .from('profiles')
          .select('user_id')
          .eq('email', authEmail)
          .maybeSingle();

        let existingUserId = existingProfile?.user_id as string | undefined;

        // If no profile row, attempt to find auth user by listing (best-effort)
        if (!existingUserId) {
          try {
            const { data: usersList } = await admin.auth.admin.listUsers();
            const found = usersList?.users?.find(u => u.email?.toLowerCase() === authEmail.toLowerCase());
            existingUserId = found?.id;
          } catch (_) {
            // ignore list failures
          }
        }

        if (existingUserId) {
          // Update password and confirm email
          try {
            await admin.auth.admin.updateUserById(existingUserId, {
              password,
              email_confirm: true,
            });
          } catch (e) {
            console.warn('updateUserById failed', e);
          }

          const normalizedCompany = company === 'BGC' || company === 'Kent' ? company : null;

          const { error: upsertErr } = await admin
            .from('profiles')
            .upsert({
              user_id: existingUserId,
              email,
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`,
              company: normalizedCompany as any,
              phone_number: phone ?? null,
              personal_email: personalEmail ?? null,
              functional_email: !!isFunctionalEmail,
              functional_email_address: functionalEmail ?? null,
              status: 'active',
              role: role || 'user',
              ta2_discipline: discipline ?? null,
              ta2_commission: commission ?? null,
              account_status: 'active',
            }, { onConflict: 'user_id' });

          if (upsertErr) {
            console.error('upsert existing profile error:', upsertErr);
            return new Response(JSON.stringify({ error: upsertErr.message }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          // Assign system role if provided for existing user
          if (systemRole) {
            const { error: roleErr } = await admin
              .from('user_roles')
              .upsert({
                user_id: existingUserId,
                role: systemRole as any,
                granted_by: existingUserId,
              }, { onConflict: 'user_id,role' });

            if (roleErr) {
              console.error("assign system role error for existing user:", roleErr);
            }
          }

          return new Response(JSON.stringify({ success: true, user_id: existingUserId, existing_user: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Could not resolve existing user id
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.error("createUser error:", createErr);
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create auth user" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = created.user.id;

    // Normalize company to enum if supported (only set when known)
    const normalizedCompany = company === 'BGC' || company === 'Kent' ? company : null;

    // 2) Upsert profile (handle case where a row may already exist)
    const { error: profileErr } = await admin
      .from('profiles')
      .upsert({
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
      }, { onConflict: 'user_id' });

    if (profileErr) {
      console.error("insert profile error:", profileErr);
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 3) Assign system role if provided
    if (systemRole) {
      const { error: roleErr } = await admin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: systemRole as any,
          granted_by: userId,
        }, { onConflict: 'user_id,role' });

      if (roleErr) {
        console.error("assign system role error:", roleErr);
        // Don't fail the whole operation for role assignment issues
      }
    }

    // We intentionally skip assigning privileges here to avoid complexity.

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
