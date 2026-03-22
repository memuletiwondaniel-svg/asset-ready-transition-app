import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkUserRequest {
  firstName: string;
  lastName: string;
  password: string;
  personalEmail: string;
  email: string;
  isFunctionalEmail: boolean;
  company: string;
  role: string;
  plant?: string;
  commission?: string;
  phone?: string;
  systemRole?: string;
  hub?: string;
}

interface BulkCreateUsersRequest {
  users: BulkUserRequest[];
}

interface UserResult {
  email: string;
  success: boolean;
  userId?: string;
  error?: string;
  existingUser?: boolean;
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
  // --- Admin Role Check ---
  {
    const _svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: _role } = await _svc.from('user_roles').select('role').eq('user_id', _claimsData.claims.sub as string).eq('role', 'admin').maybeSingle();
    if (!_role) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
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
    const body: BulkCreateUsersRequest = await req.json();
    const { users } = body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: "No users provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Processing ${users.length} users for bulk creation`);

    // Fetch lookup tables once
    const [rolesData, commissionsData, hubsData, plantsData] = await Promise.all([
      admin.from('roles').select('id, name').eq('is_active', true),
      admin.from('commission').select('id, name').eq('is_active', true),
      admin.from('hubs').select('id, name').eq('is_active', true),
      admin.from('plant').select('id, name').eq('is_active', true),
    ]);

    const rolesMap = new Map(rolesData.data?.map(r => [r.name.toLowerCase(), r.id]) || []);
    const commissionsMap = new Map(commissionsData.data?.map(c => [c.name.toLowerCase(), c.id]) || []);
    const hubsMap = new Map(hubsData.data?.map(h => [h.name.toLowerCase(), h.id]) || []);
    const plantsMap = new Map(plantsData.data?.map(p => [p.name.toLowerCase(), p.id]) || []);

    // Add alternative mappings for common variations
    if (hubsData.data) {
      for (const h of hubsData.data) {
        // Handle "NRNGL, BNGL & NR/SR" variations
        if (h.name.includes('NRNGL') || h.name.includes('BNGL')) {
          hubsMap.set('nrngl, bngl & nr/sr', h.id);
          hubsMap.set('nrngl/bngl & nr/sr', h.id);
        }
      }
    }

    if (plantsData.data) {
      for (const p of plantsData.data) {
        // Add short name mappings
        const shortNames: Record<string, string[]> = {
          'uq': ['um qasr', 'umm qasr'],
          'kaz': ['kaz'],
          'nrngl': ['north rumaila ngl', 'nr ngl'],
          'cs': ['cs', 'central'],
          'bngl': ['basra ngl'],
        };
        for (const [short, longs] of Object.entries(shortNames)) {
          if (p.name.toLowerCase().includes(short) || longs.some(l => p.name.toLowerCase().includes(l))) {
            plantsMap.set(short, p.id);
          }
        }
      }
    }

    const normalizeCompany = (val: string): 'BGC' | 'KENT' | null => {
      const v = (val || '').trim().toUpperCase();
      if (v === 'BGC') return 'BGC';
      if (v === 'KENT' || v === 'KENT ENGINEERING') return 'KENT';
      return null;
    };

    const results: UserResult[] = [];

    for (const user of users) {
      const {
        firstName,
        lastName,
        password,
        personalEmail,
        email,
        isFunctionalEmail,
        company,
        role,
        plant,
        commission,
        phone,
        systemRole,
        hub,
      } = user;

      // Skip empty rows
      if (!firstName || !lastName || !email) {
        continue;
      }

      try {
        // Determine auth email
        const authEmail = (isFunctionalEmail && personalEmail) ? personalEmail : email;

        // Lookup IDs
        const roleId = role ? rolesMap.get(role.toLowerCase()) : null;
        const commissionId = commission ? commissionsMap.get(commission.toLowerCase()) : null;
        const hubId = hub ? hubsMap.get(hub.toLowerCase()) : null;
        const plantId = plant ? plantsMap.get(plant.toLowerCase()) : null;

        // Build position text
        let positionText = role || 'User';
        if (commission) {
          positionText = `${role} - ${commission}`;
        }

        const normalizedCompany = normalizeCompany(company);

        // Create auth user
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

        let userId: string;
        let isExistingUser = false;

        if (createErr) {
          if (createErr.message?.includes('already been registered')) {
            // Handle existing user
            const { data: existingProfile } = await admin
              .from('profiles')
              .select('user_id')
              .eq('email', authEmail)
              .maybeSingle();

            if (existingProfile?.user_id) {
              userId = existingProfile.user_id;
              isExistingUser = true;

              // Update password for existing user
              try {
                await admin.auth.admin.updateUserById(userId, {
                  password,
                  email_confirm: true,
                });
              } catch (e) {
                console.warn(`Failed to update password for ${authEmail}:`, e);
              }
            } else {
              // Try to find by listing users
              const { data: usersList } = await admin.auth.admin.listUsers();
              const found = usersList?.users?.find(u => u.email?.toLowerCase() === authEmail.toLowerCase());
              if (found) {
                userId = found.id;
                isExistingUser = true;
              } else {
                results.push({ email, success: false, error: 'User exists but could not find ID' });
                continue;
              }
            }
          } else {
            results.push({ email, success: false, error: createErr.message });
            continue;
          }
        } else {
          userId = created.user!.id;
        }

        // Upsert profile
        const { error: profileErr } = await admin
          .from('profiles')
          .upsert({
            user_id: userId,
            email,
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            company: normalizedCompany,
            phone_number: phone || null,
            personal_email: personalEmail || null,
            functional_email: !!isFunctionalEmail,
            functional_email_address: isFunctionalEmail ? email : null,
            status: 'active',
            position: positionText,
            role: roleId || null,
            commission: commissionId || null,
            hub: hubId || null,
            plant: plantId || null,
            account_status: 'active',
            is_active: true,
          }, { onConflict: 'user_id' });

        if (profileErr) {
          console.error(`Profile upsert error for ${email}:`, profileErr);
          results.push({ email, success: false, error: profileErr.message });
          continue;
        }

        // Assign system role if provided
        if (systemRole) {
          const roleValue = systemRole.toLowerCase() === 'admin' ? 'admin' : 'user';
          await admin
            .from('user_roles')
            .upsert({
              user_id: userId,
              role: roleValue,
              granted_by: userId,
            }, { onConflict: 'user_id,role' });
        }

        results.push({
          email,
          success: true,
          userId,
          existingUser: isExistingUser,
        });

        console.log(`Successfully ${isExistingUser ? 'updated' : 'created'} user: ${email}`);

      } catch (err: any) {
        console.error(`Error processing user ${email}:`, err);
        results.push({ email, success: false, error: err.message || 'Unknown error' });
      }
    }

    const summary = {
      total: results.length,
      created: results.filter(r => r.success && !r.existingUser).length,
      updated: results.filter(r => r.success && r.existingUser).length,
      failed: results.filter(r => !r.success).length,
    };

    console.log('Bulk user creation summary:', summary);

    return new Response(JSON.stringify({ 
      success: true, 
      summary,
      results 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (e: any) {
    console.error("bulk-create-users unexpected error:", e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
